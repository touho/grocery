const wsUrl = window.location.href.replace("http", "ws").replace("index.html", "stream");

function prepare() {
  let handleSuccess = function(stream) {
    const AC = window.AudioContext || window.webkitAudioContext;
    context = new AC();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(1024, 1, 1);

    source.connect(processor);
    processor.connect(context.destination);

    const mic = { context, onAudio: () => {} };
    processor.onaudioprocess = buffer => mic.onAudio(buffer);
    return mic;
  };

  return navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(handleSuccess);
}

function generateFilter(sampleRate, cutoff, length) {
  if (length % 2 == 0) {
    throw Error("Filter length must be odd");
  }
  const sinc = x => {
    if (x === 0.0) return 1.0;
    const piX = Math.PI * x;
    return Math.sin(piX) / piX;
  };
  const filter = [];
  let sum = 0;
  for (let i = 0; i < length; i++) {
    let x = sinc(((2 * cutoff) / sampleRate) * (i - (length - 1) / 2));
    filter.push(x);
    sum += x;
  }
  return filter.map(x => x / sum);
}

function downsampler(from) {
  let buffer = new Float32Array(0);
  let cutoff = 16000;
  let sampleRatio = from / cutoff;
  let filter = generateFilter(from, cutoff / 2, 23);
  return function(input) {
    let inputBuffer = new Float32Array(buffer.length + input.length);
    inputBuffer.set(buffer, 0);
    inputBuffer.set(input, buffer.length);

    let outputLength = Math.ceil((inputBuffer.length - filter.length) / sampleRatio);
    let outputBuffer = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      let offset = Math.round(sampleRatio * i);
      for (let j = 0; j < filter.length; j++) {
        outputBuffer[i] += inputBuffer[offset + j] * filter[j];
      }
    }

    let remainingOffset = Math.round(sampleRatio * outputLength);
    if (remainingOffset < inputBuffer.length) {
      buffer = inputBuffer.slice(remainingOffset);
    } else {
      buffer = new Float32Array(0);
    }

    return outputBuffer;
  };
}

function convertToFloat32ToInt16(buffer) {
  let l = buffer.length;
  const buf = new Int16Array(l);

  while (l--) {
    buf[l] = buffer[l] * (buffer[l] < 0 ? 0x8000 : 0x7fff);
  }
  return buf.buffer;
}

function connect(mic) {
  setStatus("Ready");
  let isRecording = false;

  const ds = downsampler(mic.context.sampleRate);

  const ws = new WebSocket(`${wsUrl}?sampleRate=16000&languageCode=fi`);

  ws.onerror = event => {
    setStatus("WebSocket error, check console for details");
    console.error(event);
  };

  ws.onmessage = message => {
    const event = JSON.parse(message.data);
    if (event.event === "transcription") {
      const items = document.getElementById("items");
      const utteranceId = event.data.utteranceId;
      let utteranceDiv = document.getElementById(utteranceId);
      if (!utteranceDiv) {
        utteranceDiv = document.createElement("div");
        utteranceDiv.setAttribute("id", utteranceId);
        items.prepend(utteranceDiv);
      }
      if (event.data.segments.length > 0) {
        utteranceDiv.innerHTML = "";
        event.data.segments.forEach(segment => {
          let product = segment.products[0];
          if (product) {
            const el = document.createElement("div");
            el.setAttribute("class", "item");
            el.innerHTML = `<p>${segment.transcript}</p><p class="displayText">${product.displayText}</p><img src="${product.imageUrl}"/>`;
            utteranceDiv.prepend(el);
          }
        });
      }
    }
  };

  mic.onAudio = buffer => {
    if (isRecording) {
      const buffer16 = convertToFloat32ToInt16(ds(buffer.inputBuffer.getChannelData(0)));
      ws.send(buffer16);
    }
  };

  let recordDiv = document.getElementById("record");

  function start() {
    ws.send(JSON.stringify({ event: "start" }));
    isRecording = true;
    recordDiv.innerHTML = "Recording";
  }

  function stop() {
    ws.send(JSON.stringify({ event: "stop" }));
    isRecording = false;
    recordDiv.innerHTML = "Record";
  }

  recordDiv.addEventListener("mousedown", start);
  recordDiv.addEventListener("mouseup", stop);
}

function setStatus(status) {
  document.getElementById("status").innerHTML = status;
}

window.onload = function() {
  setStatus("Getting microphone permission");
  prepare()
    .then(connect)
    .catch(err => {
      console.error(err);
      setStatus("Error: " + err);
    });
};

const wsUrl = window.location.href.replace("http", "ws").replace("index.html", "stream");

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

const SLU_STATE = {
  notConnected: "Connect",
  connecting: "Connecting",
  ready: "Record",
  recording: "Recording"
};

function slu() {
  const context = { ontranscription: () => {}, onstatus: status => {}, onstatechange: text => {} };
  const kStart = Symbol("start");
  const kStop = Symbol("stop");
  let ws = undefined;

  function isConnected() {
    return ws && ws.readyState === 1;
  }

  context.start = event => {
    event.preventDefault();
    if (isConnected()) {
      ws[kStart]();
      context.onstatechange(SLU_STATE.recording);
    } else {
      context.onstatechange(SLU_STATE.connecting);
      prepare()
        .then(connect)
        .then(w => {
          context.onstatus("Ready");
          context.onstatechange(SLU_STATE.ready);
          ws = w;
        })
        .catch(err => {
          console.error(err);
          context.onstatus("Error: " + err);
        });
    }
  };

  context.stop = event => {
    event.preventDefault();
    if (isConnected()) {
      ws[kStop]();
      context.onstatechange(SLU_STATE.ready);
    }
  };

  function prepare() {
    let timeoutHandle;

    let handleSuccess = function(stream) {
      const AC = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AC();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      const mic = { stream, context: audioContext, onAudio: () => {} };
      processor.onaudioprocess = buffer => mic.onAudio(buffer);
      return mic;
    };

    return navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(handleSuccess);
  }

  function connect(mic) {
    const ds = downsampler(mic.context.sampleRate);
    // example when opening a language specific slu stream:
    // const languageCode = "en-US";
    // const ws = new WebSocket(`${wsUrl}?sampleRate=16000&languageCode=${languageCode}`);
    const ws = new WebSocket(`${wsUrl}?sampleRate=16000`);
    let timeoutHandle = undefined;
    let isRecording = false;

    ws.onerror = event => {
      context.onstatus("WebSocket error, check console for details");
      console.error(event);
    };

    ws.onclose = event => {
      context.onstatus("WebSocket closed, reconnect");
      context.onstatechange(SLU_STATE.notConnected);
      mic.context.close();
      mic.stream.getTracks().forEach(track => track.stop());
    };

    ws.onmessage = message => {
      const event = JSON.parse(message.data);
      if (event.event === "transcription") {
        context.ontranscription(event.data);
      }
    };

    mic.onAudio = buffer => {
      if (isRecording) {
        const buffer16 = convertToFloat32ToInt16(ds(buffer.inputBuffer.getChannelData(0)));
        ws.send(buffer16);
      }
    };

    function timeout() {
      ws.close();
    }

    ws[kStart] = () => {
      clearTimeout(timeoutHandle, timeout);
      ws.send(JSON.stringify({ event: "start" }));
      isRecording = true;
    };

    ws[kStop] = () => {
      ws.send(JSON.stringify({ event: "stop" }));
      isRecording = false;
      timeoutHandle = setTimeout(timeout, 30000);
    };

    timeoutHandle = setTimeout(timeout, 30000);
    return ws;
  }

  return context;
}

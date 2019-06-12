FROM node:11-slim

#RUN mkdir /data
#COPY data /app/data/

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 8080

ENTRYPOINT ["node", "index.js"]

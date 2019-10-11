FROM node:12-slim

#RUN mkdir /data
#COPY data /app/data/

WORKDIR /app
COPY . .
RUN npm install --unsafe-perm
RUN npm run build

EXPOSE 8080

ENTRYPOINT ["node", "index.js"]

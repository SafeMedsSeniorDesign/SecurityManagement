FROM node:10

WORKDIR /usr/src/SecurityManagement

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "src/index.js" ]
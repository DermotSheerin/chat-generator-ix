FROM node:12
COPY . /
RUN npm install
//EXPOSE 8888
ENTRYPOINT [ "node", "index.js" ]
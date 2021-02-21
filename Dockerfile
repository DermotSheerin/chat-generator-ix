FROM node:12
COPY . /
RUN npm install
EXPOSE 8000
CMD [ "node", "index.js" ]
RUN docker run -it -d -p 8000:8000 f3273eb32e8138438091ed2a534682b55755a97f:latest
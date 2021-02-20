FROM node:12
COPY . /
RUN npm install
EXPOSE 8000
CMD [ "node", "index.js" ]
FROM node:12
COPY . /
#COPY package.json .
RUN npm install
EXPOSE 8001
#ENTRYPOINT [ "node", "index.js" ]
CMD [ "node", "index.js" ]
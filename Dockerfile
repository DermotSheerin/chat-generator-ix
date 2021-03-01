FROM node:12
COPY . /
#COPY package.json .
RUN npm install
EXPOSE 8000
#ENTRYPOINT [ "node", "index.js" ]
CMD [ "node", "index.js" ]
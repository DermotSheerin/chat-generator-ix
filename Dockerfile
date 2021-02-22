FROM node:12
COPY . /
RUN npm install
RUN apt-get -y install docker-ce
EXPOSE 8000
#ENTRYPOINT [ "node", "index.js" ]
CMD [ "node", "index.js" ]
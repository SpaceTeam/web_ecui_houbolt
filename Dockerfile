#FROM node:10-alpine

## Create app directory
#WORKDIR /usr/src/app
#
## Install app dependencies
## A wildcard is used to ensure both package.json AND package-lock.json are copied
## where available (npm@5+)
#COPY package*.json ./
#
#RUN npm install
#RUN npm install -g nodemon
## If you are building your code for production
## RUN npm ci --only=production
#
## Bundle app source
#COPY . .
#
#EXPOSE 8080
#CMD [ "nodemon", "-L", "server.js" ]
#FROM node:8-alpine
## Create app directory
#RUN mkdir -p /usr/src/app
#WORKDIR /usr/src/app
## Install dependencies
#COPY package.json .
#RUN npm install
## Bundle app source
#COPY . .
## Exports
#EXPOSE 8080
#CMD [ "npm", "run", "start.dev" ]
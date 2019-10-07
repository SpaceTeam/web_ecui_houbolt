FROM node:10-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
# Install dependencies
COPY package*.json ./
#RUN apk add g++ make python nodejs
RUN npm install       # Install required NPM modules
# Bundle app source
COPY . .
# Exports
EXPOSE 3000
CMD [ "npm", "run", "start" ]
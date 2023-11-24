# FROM node:latest
FROM node:21-alpine3.17

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# Bundle app source
COPY ./dist ./dist

EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]

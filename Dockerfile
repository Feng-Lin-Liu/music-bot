FROM node:18
WORKDIR /
COPY . /
RUN npm install
EXPOSE 8080
CMD ["npm", "start"]

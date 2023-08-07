FROM node:18.14.1-alpine3.17 as ts-compile
WORKDIR /usr/file-scanner-service
COPY . ./
RUN npm install

FROM gcr.io/distroless/nodejs:18
WORKDIR /usr/file-scanner-service
COPY --from=ts-compile /usr/file-scanner-service ./
USER 1000
CMD ["node","src/app.js"]
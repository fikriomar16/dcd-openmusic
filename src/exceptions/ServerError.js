class ServerError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ServerError';
    this.status = 'error';
  }
}

module.exports = ServerError;

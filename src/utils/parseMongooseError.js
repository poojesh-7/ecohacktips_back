function parseMongooseError(error) {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err) => err.message);
    return { type: "validation", messages };
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return { type: "duplicate", messages: [`${field} already exists`] };
  }

  return { type: "unknown", messages: ["An unknown error occurred"] };
}

module.exports = parseMongooseError;

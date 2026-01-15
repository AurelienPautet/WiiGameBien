class Block {
  constructor(position, type) {
    this.position = position;
    this.size = {
      w: 50,
      h: 50,
    };
    this.type = type;
  }
}

try {
  module.exports = Block;
} catch (error) {
  console.error("Error exporting Block class:", error);
}

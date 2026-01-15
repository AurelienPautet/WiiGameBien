class Hole {
  constructor(position) {
    this.position = position;
    this.size = {
      w: 50,
      h: 50,
    };
  }
}

try {
  module.exports = Hole;
} catch (error) {
  console.error("Error exporting Hole class:", error);
}

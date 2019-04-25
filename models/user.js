import mongoose from "mongoose";

const Schema = mongoose.Schema;

let Account = new Schema({
  username: {
    type: String,
    unique: true
  },
  password: {
    type: String
  }
});

export default mongoose.model("Account", Account);

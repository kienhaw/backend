import mongoose from "mongoose";

const Schema = mongoose.Schema;

let Session = new Schema({
  expires: {
    type: Date
  },
  session: {
    type: Object
  }
});

export default mongoose.model("Session", Session);

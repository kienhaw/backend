import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

import Issue from './models/issue';

const app = express();
const router = express.Router();

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/mydb', { useNewUrlParser: true });
const connection = mongoose.connection;

connection.once('open', () => {
  console.log('MongoDB database connection established successfully.');
});

router.route('/issues').get((req, res) => {
  var pageNo = parseInt(req.query.pageNo);
  var size = parseInt(req.query.size);
  var response = {};
  var query = {};
  if (pageNo < 0 || pageNo === 0) {
    response = {
      error: true,
      message: 'invalid page number, should start with 1'
    };
    return res.json(response);
  }
  query.skip = size * (pageNo - 1);
  query.limit = size;
  // Find some documents
  Issue.countDocuments({}, function(err, totalCount) {
    if (err) {
      response = { error: true, data: 'Error fetching data' };
    }
    Issue.find({}, {}, query, function(err, data) {
      // Mongo command to fetch all data from collection.
      if (err) {
        response = { error: true, data: 'Error fetching data' };
      } else {
        var totalPages = Math.ceil(totalCount / size);
        response = { error: false, data: data, pages: totalPages };
      }
      res.json(response);
    });
  });
});

router.route('/issues/:id').get((req, res) => {
  Issue.findById(req.params.id, (err, issue) => {
    if (!err) {
      res.json(issue);
    } else {
      console.log(err);
    }
  });
});

router.route('/issues/add').post((req, res) => {
  let issue = new Issue(req.body);

  issue
    .save()
    .then(issue => {
      res.status(200).json({ issue: 'Added successfully' });
    })
    .catch(err => {
      res.status(400).send('Faled to create new record');
    });
});

router.route('/issues/update/:id').post((req, res) => {
  Issue.findById(req.params.id, (err, issue) => {
    if (!issue) return next(new Error('Could not load document'));
    else {
      issue.title = req.body.title;
      issue.responsible = req.body.responsible;
      issue.description = req.body.description;
      issue.severity = req.body.severity;
      issue.status = req.body.status;
    }

    issue
      .save()
      .then(issue => {
        res.json('Update done.');
      })
      .catch(err => {
        res.status(400).send('Update failed');
      });
  });
});

router.route('/issues/delete/:id').get((req, res) => {
  Issue.findByIdAndRemove({ _id: req.params.id }, (err, issue) => {
    if (err) res.json(err);
    else res.json('Remove successfully');
  });
});

app.use('/', router);

app.listen(4000, () => console.log('Express Server Running On Port 4000'));

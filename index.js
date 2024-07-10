const express = require('express')
const bodyParser = require("body-parser");
const cors = require('cors')
const mongoose = require('mongoose');
const moment = require('moment');
require('dotenv').config()

const User = require('./models/user.model');
const Exercise = require('./models/exercise.model');

const app = express()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res, next) => {
  const users = await User.find();

  res.status(200).json([...users]);
})

app.post('/api/users', async (req, res, next) => {
  const username = req.body.username;
  const user = new User({ username });

  const savedUser = await user.save();

  res.status(201).json({ ...savedUser._doc });
});

app.post('/api/users/:id/exercises', async (req, res, next) => {
  const user = await User.findById(req.params.id);
  const exercise = new Exercise({
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date ? new Date(req.body.date) : new Date(),
    userId: user
  });

  const savedExercise = await exercise.save();

  const response = {
    _id: user._id,
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date.toDateString()
  };

  res.status(201).json(response);
})

app.get('/api/users/:id/logs', async (req, res, next) => {
  const user = await User.findById(req.params.id);
  const limit = req.query.limit || '';
  const fromDate = req.query.from || '';
  const toDate = req.query.to || '';

  // Use moment to parse and set start/end of day for date range
  const validStartDate = fromDate ? moment(fromDate).startOf('day').toDate() : null;
  const validEndDate = toDate ? moment(toDate).endOf('day').toDate() : null;

  const query = {
    userId: user._id,
    ...(validStartDate || validEndDate ? {
      date: {
        ...(validStartDate ? { $gte: validStartDate } : {}),
        ...(validEndDate ? { $lte: validEndDate } : {})
      }
    } : {})
  };

  console.log(query);

  const exercises = await Exercise.find(query).limit(limit).select(('-userId -_id'));

  const formattedExercises = exercises.map(exercise => ({
    ...exercise.toObject(),
    date: exercise.date.toDateString()
  }));

  const count = formattedExercises.length;

  res.status(200).json({ count, ...user._doc, log: formattedExercises });
})

let listener;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    listener = app.listen(process.env.PORT || 3000, () => {
      console.log('Your app is listening on port ' + listener.address().port)
    })
  })
  .catch(error => console.log(error));


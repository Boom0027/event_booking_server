const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const graphql = require('express-graphql');
const { buildSchema } = require('graphql');
const Event = require('./src/models/event');
const User = require('./src/models/user');
const { hash } = require('./src/helper/bcryptHelper');

// Step 1: Create a new app
const app = express();

// Step 2: Use body-parser
app.use(bodyParser.json());

/**
 * Get the events by the user
 * @param {String} userID
 */
async function getEventsByUser(userID) {
  // Step 1: Get the events
  const events = await Event.find({ creator: userID });

  // Step 2: Return the events
  return events.map((event) => {
    // Step 1: Destructuring
    const {
      id, title, description, price, date, creator,
    } = event;

    // Step 2: Return the events
    return {
      id,
      title,
      description,
      price,
      date,
      creator: async () => getUserById(creator),
    };
  });
}

/**
 * Get user by id
 * @param {String} userID
 */
async function getUserById(userID) {
  // Step 2.1: Get the user
  const user = await User.findById(userID);

  // Step 2.2: Check if user exists
  if (!user) {
    throw new Error("user doesn't exists");
  }

  // Step 2.3: Return the user
  return {
    id: user.id,
    email: user.email,
    createdEvents: async () => getEventsByUser(userID),
  };
}

// Step 3: Define middleware
app.use('/graphql', graphql({
  schema: buildSchema(`
    type User {
      id: ID!
      email: String!
      password: String
      createdEvents: [Event!]
    }

    input UserInput {
      email: String!
      password: String
    }

    type Event {
      id: ID!
      title: String!
      description: String!
      price: Float!
      date: String!
      creator: User!
    }

    input EventInput {
      title: String!
      description: String!
      price: Float!
      date: String!
    }

    type RootQuery {
      events: [Event!]!
    }

    type RootMutation {
      createEvent(eventInput: EventInput): Event
      createUser(userInput: UserInput): User
    }
  
    schema {
      query: RootQuery
      mutation: RootMutation   
    }
  `),
  rootValue: {
    events: async () => {
      // Step 1: Get the events
      const events = await Event.find();

      return events.map((event) => {
        // Step 1: Destructuring
        const {
          id, title, description, price, date, creator,
        } = event;

        // Step 2: Return the events
        return {
          id,
          title,
          description,
          price,
          date,
          creator: async () => getUserById(creator),
        };
      });
    },
    createEvent: async ({ eventInput }) => {
      // Step 1: Destructure
      const {
        title, description, price, date,
      } = eventInput;

      // Step 2: Create a new event
      const newEvent = await new Event(
        {
          title,
          description,
          price: +price,
          date: new Date(date),
          creator: '5ee6979f68bc6042fc01453d',
        },
      ).save();

      // Step 3: Return the data
      return {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        price: newEvent.price,
        date: newEvent.date,
        creator: async () => getUserById('5ee6979f68bc6042fc01453d'),
      };
    },
    createUser: async ({ userInput }) => {
      // Step 1: Destructure
      const { email, password } = userInput;

      // Step 2: Hash password
      const hashedPassword = await hash(password);

      // Step 3: Create new user
      try {
        const user = await new User({
          email,
          password: hashedPassword,
        }).save();

        // Step 4: Return the user
        return {
          id: user.id,
          email: user.email,
          password: null,
        };
      } catch (err) {
        // @TODO: Create object for error codes
        if (err.code === 11000) {
          throw new Error('email is taken');
        }
        throw new Error('something went wrong');
      }
    },
  },
  graphiql: true,
}));

// Step 4: Define check
app.get('/', (req, res, _next) => {
  res.send('Hello world');
});

// Step 5: Connect to mongodb and listen to port
mongoose.connect(
  process.env.DB_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  },
).then(() => {
  // Step 5.1: Listen on port
  app.listen(3000, () => {
  // eslint-disable-next-line no-console
    console.log('Listening to port 3000');
  });
}).catch((_err) => {
  // eslint-disable-next-line no-console
  console.log('Unable to connect to database');
});

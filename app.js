require('dotenv').config();
require('express-async-errors');
const path = require('path');
const express = require('express');
const app = express();

const morgan = require('morgan');
const cookieParser = require('cookie-parser'); //to get access to the cookie received from the browser
const fileUpload = require('express-fileupload');

const rateLimiter = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

//db
const connectDB = require('./db/connect');

//routers
const authRouter = require('./routes/authRoutes');
const userRouter = require('./routes/userRoutes');
const productRouter = require('./routes/productRoute');
const reviewRouter = require('./routes/reviewRoutes');
const orderRouter = require('./routes/orderRoutes');

//middleware
const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

app.set('trust proxy', 1);
app.use(
  rateLimiter({
    windowsMs: 15 * 60 * 1000,
    max: 60,
  })
);

app.use(helmet());
app.use(cors({ origin: ["http://localhost:3000", "https://react-nodejs-ecommerce.netlify.app"], credentials: true })); //CHAGE TO REAL URL ON NETLIFY
app.use(xss());
app.use(mongoSanitize());

app.use(morgan('tiny')); //log  in terminal every request methode + statuscode
app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET)); //access cookies coming back from the browser- with each request the browser will send cookie + we're signing cookies with jwt secret
app.use(express.static('./public', { extensions: ['html'] })); // a way for /docs to work being served from public folder instead of needing its own dedicated route definition (also fix issue with js not working)
app.use(fileUpload());


app.get('/browser-app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'browser-app.js'));
});

// //testing in postman if the token is stored in a cookie
// app.get('/api/v1', (req, res) => {
//   //console.log(req.cookies);
//   console.log(req.signedCookies); //cookie available in .signedCookies
//   res.send('ecommerce api');
// });

// app.get('/docs', (req, res) => {
//   res.sendFile(path.join(__dirname, 'docs.html'));
// }); // Could get this with just the public folder

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/orders', orderRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL);
    app.listen(port, console.log(`Server is listening on port ${port}`));
  } catch (error) {
    console.log(error);
  }
};

start();

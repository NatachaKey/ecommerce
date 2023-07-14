//CHECK ON BACKEND IF PRODUCT EXISTS, EVRTH IS CORRECT BEFORE LETTING USER TO CHECOUT AND PAY WITH STRIPE
const Order = require('../models/Order');
const Product = require('../models/Product');
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const { checkPermissions } = require('../utils');

const fakeStripeAPI = async ({ amount, currency }) => {
  const client_secret = 'someRandomValue';
  return { client_secret, amount };
};

// [OPTION] processOrder could be defined here, outside of createOrder

const createOrder = async (req, res) => {
  // [OPTION] processOrder could be defined here, inside createOrder, but **before** the reducer needs to use the function

// first, we define how we want the reducer to work. This function could be put at the top of the `createOrder` function 
// or could even be outside of the `createOrder`, at the top of the `orderController.js` file. 
// It could even be in a separate folder and get imported in. 
// The main important part is that it should be fully defined, _before_ we try to use it in the reducer

const processOrder = async (resultsMap, item) => {
  // Each iteration, item will be the next item in the array. !!!!! resultsMap represents the accumulator, which will hold the intermediate results during the reduction process. item represents the current item being processed from the cartItems array.
  //resultsMap will be whatever we return at the end of the reduce function, and the first time it will be equal to `initialValue` (because we pass that to reduce as the second argument on line 26)
  const dbProduct = await Product.findOne({ _id: item.product });
  console.log(
    `looping through: resultsMap=${JSON.stringify(
      await resultsMap,
    )} | item=${JSON.stringify(item)} | dbProduct=${dbProduct}`,
  );

  if (!dbProduct) {
    throw new CustomError.NotFoundError(`No product with id ${item.product}`);
  }

  const { name, price, image, _id } = dbProduct; //properties (name, price, image, _id) are extracted from the dbProduct.
  const singleOrderItem = {
    amount: item.amount,
    name,
    price,
    image,
    product: _id,
  }; //singleOrderItem: It is created using the extracted properties from dbProduct and the amount from the current item.

  // Because resultsMap was returned in an async function; it is wrapped in a Promise; so we need to await before we can edit its fields. Node is working on each item in the cartItems array, in _parallel_ to save time
  resultsMap = await resultsMap; //is used to ensure that any previous asynchronous operations are completed before modifying it.

  resultsMap.orderItems = [...resultsMap.orderItems, singleOrderItem]; //with each iteration add new  singleOrderItem //The singleOrderItem is added to the orderItems array in resultsMap.
  resultsMap.subtotal += item.amount * price; // The subtotal in resultsMap is updated by adding the product of item.amount and price.

  // We have to return resultsMap so that the reduce function knows to use the updated values for the next item in the list
  return resultsMap; //The updated resultsMap is returned so that it can be used as the accumulator for the next iteration of the reduce() function.
};



const { orderItems: cartItems, tax, shippingFee, subtotal } = req.body;

if (!cartItems || cartItems.length < 1) {
  throw new CustomError.BadRequestError('No cart items provided');
}
if (!tax || !shippingFee) {
  throw new CustomError.BadRequestError(
    'Please provide tax and shipping fee',
  );
}

// [OPTION] processOrder could be defined here, inside createOrder, but **before** the reducer needs to use the function

// initial accumulator value. For each iteration through cartItems, we will do some processing in `processOrder` function to update this object
const initialValue = { subtotal: 0, orderItems: [] };

// Now we execute the `reduce` function, telling it to run the `processOrder` function for each item in cartItems
// We also give it the `initialValue` so that for the first iteration, it will use subtotal=0, and orderItems=[]
// At the end, the `reduce` function returns the updated accumulator value, which we destrucure to get the subtotal and the orderItems variables
const { subtotal, orderItems } = await cartItems.reduce(processOrder, initialValue);

//calculate order total
const total = tax + shippingFee + subtotal;
//get client Secret from "stripe"
const paymentIntent = await fakeStripeAPI({ amount: total, currency: 'usd' });

// Create the order document in Mongo database
const order = await Order.create({
  orderItems,
  total,
  subtotal,
  tax,
  shippingFee,
  clientSecret: paymentIntent.client_secret,
  user: req.user.userId,
});

res.status(StatusCodes.CREATED).json({ order });
};




const getAllOrders = async (req, res) => {
  const orders = await Order.find({});
  res.status(StatusCodes.OK).json({ orders, count: orders.length });
};

const getSingleOrder = async (req, res) => {
  const { id: orderId } = req.params;
  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    throw new CustomError.NotFoundError(`No order with id ${orderId}`);
  }
  checkPermissions(req.user, order.user);
  res.status(StatusCodes.OK).json({ order });
};

const getCurrentUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.userId }); // take req.user.userId and set it to user
  res.status(StatusCodes.OK).json({ orders, count: orders.length });
};

const payOrder=  async (req, res) => {
  const { amount, currency, description, token } = req.body;
   checkPermissions(req.user, order.user); 

   try {
    const charge = await stripe.charges.create({
      amount,
      currency,
      description,
      source: token,
    });

    // Handle successful payment
    res.json({ success: true, charge });
  } catch (error) {
    // Handle payment failure
    res.json({ success: false, error: error.message });
  }
 
};


const updatePaymentStatus = async (req, res) => {
  const { id: orderId } = req.params;
  const { paymentIntentId } = req.body;
  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    throw new CustomError.NotFoundError(`No order with id ${orderId}`);
  }
  checkPermissions(req.user, order.user); // only admin or proper user can update order

  order.paymentIntentId = paymentIntentId;
  order.status = 'paid';
  await order.save();
  res.status(StatusCodes.OK).json({ order });
};

module.exports = {
  getAllOrders,
  getSingleOrder,
  getCurrentUserOrders,
  createOrder,
  updatePaymentStatus ,
  payOrder,
};

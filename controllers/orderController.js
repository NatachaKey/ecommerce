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

const createOrder = async (req, res) => {
  const { orderItems: cartItems, tax, shippingFee, subtotal } = req.body;
  if (!cartItems || cartItems.length < 1) {
    throw new CustomError.BadRequestError('No cart items provided');
  }
  if (!tax || !shippingFee) {
    throw new CustomError.BadRequestError(
      'Please provide tax and shipping fee'
    );
  }
  
  //option 1 - REFACTORED option 2
  
  // extract the values of subtotal and orderItems from the result of the reduce() function applied to the cartItems array. The reduce() function is being invoked with the processOrder function as the reducer and initialValue as the initial accumulator value.
  const processOrder = async (resultsMap, item) => {
    
    //initial state
  const initialValue = { subtotal: 0, orderItems: [] };
    
    // Each iteration, item will be the next item in the array. !!!!! resultsMap represents the accumulator, which will hold the intermediate results during the reduction process. item represents the current item being processed from the cartItems array.
    //resultsMap will be whatever we return at the end of the reduce function, and the first time it will be equal to `initialValue` (because we pass that to reduce as the second argument on line 26)
    const dbProduct = await Product.findOne({ _id: item.product });
    console.log(
      `looping through: resultsMap=${JSON.stringify(
        await resultsMap
      )} | item=${JSON.stringify(item)} | dbProduct=${dbProduct}`
    );

    if (!dbProduct) {
      throw new CustomError.NotFoundError(`No product with id ${item.product}`);
    }
const { subtotal, orderItems } = await cartItems.reduce(
    processOrder,
    initialValue
  ); //see lines 57, 58
    
    // const generateSingleOrderItem = (dbProduct, item) => {
    //   const { name, price, image, _id } = dbProduct;
    //   return {
    //     amount: item.amount,
    //     name,
    //     price,
    //     image,
    //     product: _id,
    //   };
    // }

    // const singleOrderItem = generateSingleOrderItem(dbProduct, item)

    // this could potentially also be extracted to a helper function- see lines 45-56
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

  //option 2
  // //initial state
  //   const initialValue = { subtotal: 0, orderItems: [] };

  //   // Loop through each item in `cartItems` array (if the array is empty, this will just be skipped)
  //   const { subtotal: subtotal, orderItems: orderItems } = await cartItems.reduce(
  //     async (resultsMap, item) => {
  //       // Each iteration, item will be the next item in the array.
  //       //resultsMap will be whatever we return at the end of the reduce function, and the first time it will be equal to `initialValue` (because we pass that to reduce as the second argument on line 63)

  //       const dbProduct = await Product.findOne({ _id: item.product });
  //       console.log(
  //         `looping through: resultsMap=${JSON.stringify(
  //           await resultsMap
  //         )} | item=${JSON.stringify(item)} | dbProduct=${dbProduct}`
  //       );

  //       if (!dbProduct) {
  //         throw new CustomError.NotFoundError(
  //           `No product with id ${item.product}`
  //         );
  //       }

  //       const { name, price, image, _id } = dbProduct;
  //       const singleOrderItem = {
  //         amount: item.amount,
  //         name,
  //         price,
  //         image,
  //         product: _id,
  //       };

  //       // Because resultsMap was returned in an async function; it is wrapped in a Promise; so we need to await before we can edit its fields. Node is working on each item in the cartItems array, in _parallel_ to save time
  //       resultsMap = await resultsMap;

  //       resultsMap.orderItems = [...resultsMap.orderItems, singleOrderItem];//with each iteration add new  singleOrderItem
  //       resultsMap.subtotal += item.amount * price;

  //       // We have to return resultsMap so that the reduce function knows to use the updated values for the next item in the list
  //       return resultsMap;
  //     },
  //     initialValue
  //   );

  //option 3
  // let orderItems = [];
  // let subtotal = 0;
  // //if there are items in cartItems, we set up a loop
  // for (const item of cartItems) {
  //   const dbProduct = await Product.findOne({ _id: item.product }); // check if product exists in db -so  we get data from database, not relying on frontend
  //   if (!dbProduct) {
  //     throw new CustomError.NotFoundError(`No product with id ${item.product}`);
  //   }

  //   const { name, price, image, _id } = dbProduct;
  //   //console.log(name, price, image);
  //   const singleOrderItem = {
  //     amount: item.amount,
  //     name,
  //     price,
  //     image,
  //     product: _id,
  //   };
  //   //add item to order -OPTION 1
  //   //orderItems = [...orderItems, singleOrderItem]; //whatever items we have.. with each iteration add new  singleOrderItem
  //   orderItems.push(singleOrderItem) // OPTION 2 : to  add the single order item to the order items list each time.

  //   //calculate subtotal- with each iteration add the final price of every iterated product (multiply amount*price for every iterated product)
  //   subtotal += item.amount * price;
  // }
  //console.log(orderItems);
  //console.log(subtotal);

  //calculate total
  const total = tax + shippingFee + subtotal;
  //get client Secret
  const paymentIntent = await fakeStripeAPI({
    amount: total,
    currency: 'usd',
  });

  const order = await Order.create({
    orderItems,
    total,
    subtotal,
    tax,
    shippingFee,
    clientSecret: paymentIntent.client_secret,
    user: req.user.userId,
  });
  res
    .status(StatusCodes.CREATED)
    .json({ order});
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
};

const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('./models/user');
const Blog = require('./models/blogs');
const Category = require('./models/categories');
const Product = require('./models/product');
const Role = require('./models/role');
const passport = require('passport');
const auth = require('./middleware');
const Feedback = require('./models/feedback');
const { buildCategoryTree, renderCategoryRow } = require('./helpers');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too many requests, please try again after 5 minutes."
  }
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Middleware to protect private routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Login page
router.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

// Login POST with Passport
router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: false
  })
);

// Logout route
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// ------ DASHBOARD ------

router.get('/dashboard',limiter, ensureAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.user });
});

// ------ BLOG ROUTES ------

// List user's blogs
router.get('/blogs', ensureAuthenticated, async (req, res) => {
const blogs = await Blog.find().populate('author').sort({ createdAt: -1 });
  res.render('yourBlogs', { blogs, error: null });
});

// New blog form
router.get('/blog/new', ensureAuthenticated, (req, res) => {
  res.render('newblogs', { error: null });
});

// Create new blog
router.post('/blog/new', ensureAuthenticated, upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  const blog = new Blog({
    title,
    content,
    author: req.user._id,
    image: req.file ? '/uploads/' + req.file.filename : ''
  });
  await blog.save();
  res.redirect('/blogs');
});

// Edit blog form
router.get('/blog/edit/:id', ensureAuthenticated, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.redirect('/blogs');

  const isAdmin = req.user?.role?.name === 'Admin';
  const isOwner = blog.author.toString() === req.user._id.toString();

  if (!isAdmin && !isOwner) return res.redirect('/blogs');

  res.render('editBlog', { blog, error: null });
});


// Update blog
router.post('/blog/edit/:id', ensureAuthenticated, upload.single('image'), async (req, res) => {
  const update = {
    title: req.body.title,
    content: req.body.content
  };
  if (req.file) update.image = '/uploads/' + req.file.filename;
  await Blog.updateOne({ _id: req.params.id}, update);
  res.redirect('/blogs');
});

// Delete blog
router.post('/blog/delete/:id', auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).send('Blog not found');
  }

  const isAdmin = req.user?.role?.name === 'Admin';
  const isOwner = blog.author.toString() === req.user._id.toString();

  if (isAdmin || isOwner) {
    await Blog.deleteOne({ _id: req.params.id });
    return res.redirect('/blogs');
  }

  res.status(403).send('Forbidden: You do not have permission to delete this blog');
});

// Preview blog
router.get('/blog/preview/:id', ensureAuthenticated, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send('Blog not found');
    res.render('previewBlog', { blog });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading blog preview');
  }
});

// ------ CATEGORY ROUTES ------

// List categories (hierarchical)
router.get('/categories', ensureAuthenticated, async (req, res) => {
  try {
    const flat = await Category.find().lean().sort({ name: 1 });
    const tree = buildCategoryTree(flat);

    let rowsHtml = '';
    tree.forEach(root => {
      rowsHtml += renderCategoryRow(root, 0, req.user);
    });

    res.render('categories', {
      rowsHtml,
      error: null,
      user: req.user 
    });
  } catch (err) {
    console.error(err);
    res.render('categories', {
      rowsHtml: '',
      error: 'Failed to load categories',
      user: req.user
    });
  }
});


// New category form
router.get('/category/new', ensureAuthenticated, async (req, res) => {
  const allCategories = await Category.find().lean();
  res.render('newcategory', { error: null, category: null, allCategories });
});

// Create category
router.post('/category/new', ensureAuthenticated, async (req, res) => {
  const { name, status, parent } = req.body;
  if (!name || name.trim() === '') {
    const allCategories = await Category.find().lean();
    return res.render('newcategory', {
      error: 'Category name is required',
      category: null,
      allCategories
    });
  }
  try {
    await Category.create({ name: name.trim(), status, parent: parent || null });
    res.redirect('/categories');
  } catch (err) {
    console.error(err);
    const allCategories = await Category.find().lean();
    res.render('newcategory', {
      error: 'Category creation failed or already exists',
      category: null,
      allCategories
    });
  }
});

// Edit category form
router.get('/category/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    const allCategories = await Category.find().lean();
    if (!category) return res.redirect('/categories');
    res.render('newcategory', { category, error: null, allCategories });
  } catch (err) {
    console.error(err);
    res.redirect('/categories');
  }
});

// Update category
router.post('/category/edit/:id', ensureAuthenticated, async (req, res) => {
  const { name, status, parent } = req.body;
  try {
    await Category.findByIdAndUpdate(req.params.id, {
      name,
      status,
      parent: parent || null
    });
    res.redirect('/categories');
  } catch (err) {
    console.error(err);
    const allCategories = await Category.find().lean();
    res.render('newcategory', {
      category: { _id: req.params.id, name, status, parent },
      error: 'Failed to update category.',
      allCategories
    });
  }
});

router.post('/category/delete/:id',
  ensureAuthenticated, 
  auth.userAuthentication, 
  async (req, res) => {
    try {
      await Category.findByIdAndDelete(req.params.id);
      res.redirect('/categories');
    } catch (err) {
      console.error(err);
      res.redirect('/categories');
    }
  }
);

// ------ PRODUCT ROUTES ------

// List products with categories
router.get('/products', ensureAuthenticated, async (req, res) => {
  const products = await Product.find().populate('categories').lean();
  const formatted = products.map(p => ({
    ...p,
    categoryNames: p.categories && p.categories.length > 0
      ? p.categories.map(c => c.name).join(', ')
      : 'Uncategorized'
  }));
  res.render('products', { products: formatted, error: null });
});

// New product form
router.get('/product/new', ensureAuthenticated, async (req, res) => {
  const categories = await Category.find().lean();
  res.render('newproduct', { categories, product: null, error: null });
});

// Create product
router.post('/product/new', ensureAuthenticated, upload.single('image'), async (req, res) => {
  const { name, price } = req.body;
  const categories = Array.isArray(req.body.category) ? req.body.category : [req.body.category];
  const product = new Product({
    name,
    categories,
    price,
    image: req.file ? '/uploads/' + req.file.filename : ''
  });
  await product.save();
  res.redirect('/products');
});

// Edit product form
router.get('/product/edit/:id', ensureAuthenticated, async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  const categories = await Category.find().lean();
  if (!product) return res.redirect('/products');
  product.categories = Array.isArray(product.categories)
    ? product.categories.map(id => id.toString())
    : [];
  res.render('newproduct', { product, categories, error: null });
});

// Update product
router.post('/product/edit/:id', ensureAuthenticated, upload.single('image'), async (req, res) => {
  const { name, price } = req.body;
  const categories = Array.isArray(req.body.category) ? req.body.category : [req.body.category];
  const update = { name, categories, price };
  if (req.file) update.image = '/uploads/' + req.file.filename;
  await Product.updateOne({ _id: req.params.id }, update);
  res.redirect('/products');
});

// Delete product
router.post('/product/delete/:id', auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  await Product.deleteOne({ _id: req.params.id });
  res.redirect('/products');
});


// List roles
router.get('/roles',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  try {
    const roles = await Role.find().lean();
    res.render('roles', { roles, error: null });
  } catch (err) {
    console.error(err);
    res.render('roles', { roles: [], error: 'Failed to load roles' });
  }
});

// New role form
router.get('/roles/new',auth.userAuthentication, ensureAuthenticated, (req, res) => {
  res.render('newrole', { role: null, error: null });
});

// Create role
router.post('/roles/new',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  const { name, permissions } = req.body;
  let permsArray = [];
  if (!permissions) permsArray = [];
  else if (Array.isArray(permissions)) permsArray = permissions;
  else permsArray = [permissions];

  try {
    await Role.create({ name, permissions: permsArray });
    res.redirect('/roles');
  } catch (err) {
    console.error(err);
    res.render('newrole', { role: { name, permissions: permsArray }, error: 'Failed to create role. Please try again.' });
  }
});

// Edit role form
router.get('/roles/edit/:id',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).lean();
    res.render('newrole', { role, error: null });
  } catch (err) {
    console.error(err);
    res.redirect('/roles');
  }
});

// Update role
router.post('/roles/edit/:id',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  const { name, permissions } = req.body;
  const permsArray = permissions
    ? Array.isArray(permissions)
      ? permissions
      : [permissions]
    : [];

  try {
    await Role.findByIdAndUpdate(req.params.id, { name, permissions: permsArray });
    res.redirect('/roles');
  } catch (err) {
    console.error(err);
    const role = await Role.findById(req.params.id).lean();
    res.render('newrole', { role: { _id: req.params.id, name, permissions: permsArray }, error: 'Failed to update role' });
  }
});

// ------ USER ROUTES ------

// List users
router.get('/users',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.find().populate('role').lean();
    res.render('users', { users, error: null, userInfo: req.user });
  } catch (err) {
    console.error(err);
    res.render('users', { users: [], error: 'Failed to load users' });
  }
});

// New user form
router.get('/users/new',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  try {
    const roles = await Role.find().lean();
    res.render('newuser', { user: null, roles, error: null });
  } catch (err) {
    console.error(err);
    res.redirect('/users');
  }
});

// Create user
router.post('/users/new',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  const { name, email, phone, password, role, permissions } = req.body;
  const permissionsArray = permissions
    ? Array.isArray(permissions)
      ? permissions
      : [permissions]
    : [];

  try {
    const user = new User({ name, email, phone, password, role, permissions: permissionsArray });
    await user.save();
    res.redirect('/users');
  } catch (err) {
    console.error('Failed to create user:', err.message);
    const roles = await Role.find().lean();
    res.render('newuser', { user: req.body, roles, error: err.message || 'Failed to create user' });
  }
});

// Edit user form
router.get('/users/edit/:id',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    const roles = await Role.find().lean();
    if (!user) return res.redirect('/users');
    res.render('newuser', { user, roles, error: null });
  } catch (err) {
    console.error(err);
    res.redirect('/users');
  }
});

// Update user
router.post('/users/edit/:id',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  const { name, email, phone, password, role, permissions } = req.body;
  const permissionsArray = permissions
    ? Array.isArray(permissions)
      ? permissions
      : [permissions]
    : [];

  try {
    const update = { name, email, phone, role, permissions: permissionsArray };
    if (password && password.trim() !== '') update.password = password;
    await User.findByIdAndUpdate(req.params.id, update);
    res.redirect('/users');
  } catch (err) {
    console.error(err);
    const roles = await Role.find().lean();
    res.render('newuser', {
      user: { _id: req.params.id, name, email, phone, role, permissions: permissionsArray },
      roles,
      error: 'Failed to update user'
    });
  }
});

// Delete user
router.post('/users/delete/:id',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/users');
  } catch (err) {
    console.error(err);
    res.redirect('/users');
  }
});

//feedback api
router.get('/feedback', ensureAuthenticated, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.render('feedback', { feedbacks });
  } catch (err) {
    console.error('Failed to render feedbacks:', err.message);
    res.render('feedback', { feedbacks: [], error: 'Something went wrong' });
  }
});

router.post('/feedback', async (req, res) => {
  const{ name, email, formtype, phone, content, consent} = req.body;

  if(!req.body) {
    return res.status(400).json({ error: 'Request body is required' });

  }

  if (!name || !email || !formtype || !phone || !consent || !content) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!/^[A-Za-z\s]+$/.test(name)) {
    return res.status(400).json({ error: 'Name must contain only letters and spaces' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
// if (!/^\+\d{10,15}$/.test(phone)) {
//   return res.status(400).json({ error: 'Invalid phone number format' });
// }



  try {
    const feedback = new Feedback({
      name,
      email,
      formtype,
      phone,
      content,
      consent
    });
    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
        form.reset();

  }catch(err){
    console.error('Failed to submit feedback:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
    form.reset();
  }
})

module.exports = router;
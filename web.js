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
const blogApiRoutes = require('./src/api/blogs');
const categoryApiRoutes = require('./src/api/categories');
const slugify = require('slugify');
const BlogCategory = require('./models/blogCategory'); 
const path= require('path');

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); 
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = upload;


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}
router.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: false
  })
);

router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

router.get('/dashboard', limiter, ensureAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.user });
});

router.get('/blogs', async (req, res) => {
  try {
    const selectedCategory = req.query.category || '';
    const categories = await BlogCategory.find();

    let query = Blog.find().populate('author').populate('categories');

    if (selectedCategory) {
      query = query.where('categories').equals(selectedCategory);
    }

    const blogs = await query.sort({ createdAt: -1 });

    res.render('yourBlogs', {
      blogs,
      categories,            
      selectedCategory,
      error: null,
      user: req.user
    });

  } catch (err) {
  console.error('ERROR in /blogs:', err);
  res.status(500).render('yourBlogs', {
    blogs: [],
    categories: [],
    selectedCategory: '',
    error: 'Failed to load blogs.',
    user: req.user
  });
}

});

router.get('/blog/new', ensureAuthenticated, auth.allowBlogManager, async (req, res) => {
  try {
    const categories = await BlogCategory.find().sort({ name: 1 });
    res.render('newblogs', { error: null, categories });
  } catch (err) {
    console.error('Failed to load categories:', err.message);
    res.render('newblogs', { error: 'Failed to load categories', categories: [] });
  }
});


router.post('/blog/new', ensureAuthenticated, auth.allowBlogManager, upload.single('image'), async (req, res) => {
  const { title, content } = req.body;

  const categories = Array.isArray(req.body.categories)
    ? req.body.categories
    : [req.body.categories];

  const blog = new Blog({
    title,
    content,
    author: req.user._id,
    image: req.file ? '/uploads/' + req.file.filename : '',
    categories
  });

  await blog.save();
  res.redirect('/blogs');
});


router.get('/blog/edit/:id', ensureAuthenticated, auth.allowBlogManager, async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate('author');
  if (!blog) return res.redirect('/blogs');
  const isAdmin = req.user?.role?.name === 'Admin';
  const isBlogManager = req.user?.role?.name === 'BlogManager';
  const isOwner = blog.author?._id?.toString() === req.user._id.toString();
  if (!isAdmin && !isOwner && !isBlogManager) return res.redirect('/blogs');
const blogCategories = await BlogCategory.find().sort({ name: 1 });
res.render('editBlog', { blog, error: null, categories: blogCategories });
});

router.post('/blog/edit/:id', ensureAuthenticated, auth.allowBlogManager, upload.single('image'), async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate('author');
  if (!blog) return res.status(404).send('Blog not found');
  const isAdmin = req.user?.role?.name === 'Admin';
  const isBlogManager = req.user?.role?.name === 'BlogManager';
  const isOwner = blog.author?._id?.toString() === req.user._id.toString();
  if (!isAdmin && !isOwner && !isBlogManager) return res.status(403).send('Forbidden');
  const categories = Array.isArray(req.body.categories)
  ? req.body.categories
  : [req.body.categories];

const update = {
  title: req.body.title,
  content: req.body.content,
  categories
};

  if (req.file) update.image = '/uploads/' + req.file.filename;
  await Blog.updateOne({ _id: req.params.id }, update);
  res.redirect('/blogs');
});

router.post('/blog/delete/:id', ensureAuthenticated, auth.allowBlogManager, async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate('author');
  if (!blog) return res.status(404).send('Blog not found');
  const isAdmin = req.user?.role?.name === 'Admin';
  const isBlogManager = req.user?.role?.name === 'BlogManager';
  const isOwner = blog.author?._id?.toString() === req.user._id.toString();
  if (isAdmin || isOwner || isBlogManager) {
    await Blog.deleteOne({ _id: req.params.id });
    return res.redirect('/blogs');
  }
  res.status(403).send('Forbidden: You do not have permission to delete this blog');
});

router.get('/blog/preview/:id', ensureAuthenticated, auth.allowBlogManager, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).send('Blog not found');
    res.render('previewBlog', { blog });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading blog preview');
  }
});

router.get('/newblogcat', async (req, res) => {
  const categories = await BlogCategory.find().sort({ name: 1 });
  res.render('newBlogCategory', { categories, error: null });
});

router.post('/newblogcat', async (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-');

  try {
    const existing = await BlogCategory.findOne({ slug });
    if (existing) {
      const categories = await BlogCategory.find().sort({ name: 1 });
      return res.render('newBlogCategory', {
        categories,
        error: 'Category already exists'
      });
    }

    await BlogCategory.create({ name, slug });
    res.redirect('/newblogcat');
  } catch (err) {
    console.error('Error adding blog category:', err.message);
    const categories = await BlogCategory.find().sort({ name: 1 });
    res.render('newBlogCategory', {
      categories,
      error: 'Failed to create category.'
    });
  }
});

router.get('/blogcategory/edit/:id', ensureAuthenticated, async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);
    const categories = await BlogCategory.find().sort({ name: 1 });
    if (!category) return res.redirect('/newblogcat');
    res.render('newBlogCategoryEdit', { category, categories, error: null });
  } catch (err) {
    console.error(err);
    res.redirect('/newblogcat');
  }
});

router.post('/blogcategory/edit/:id', ensureAuthenticated, async (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-');

  try {
    const existing = await BlogCategory.findOne({ slug, _id: { $ne: req.params.id } });
    if (existing) {
      const categories = await BlogCategory.find().sort({ name: 1 });
      const category = await BlogCategory.findById(req.params.id);
      return res.render('newBlogCategoryEdit', {
        category,
        categories,
        error: 'Another category with this name already exists'
      });
    }

    await BlogCategory.findByIdAndUpdate(req.params.id, { name, slug });
    res.redirect('/newblogcat');
  } catch (err) {
    console.error('Failed to update category:', err.message);
    const category = await BlogCategory.findById(req.params.id);
    const categories = await BlogCategory.find();
    res.render('newBlogCategoryEdit', {
      category,
      categories,
      error: 'Failed to update category'
    });
  }
});

router.post('/blogcategory/delete/:id', ensureAuthenticated, async (req, res) => {
  try {
    await BlogCategory.findByIdAndDelete(req.params.id);
    res.redirect('/newblogcat');
  } catch (err) {
    console.error('Failed to delete blog category:', err.message);
    res.redirect('/newblogcat');
  }
});



router.get('/categories', ensureAuthenticated, auth.allowCatalogueManager, async (req, res) => {
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

router.get('/category/new', ensureAuthenticated, auth.allowCatalogueManager, async (req, res) => {
  const allCategories = await Category.find().lean();
  res.render('newcategory', { error: null, category: null, allCategories });
});

router.post('/category/new', ensureAuthenticated, auth.allowCatalogueManager, async (req, res) => {
  const { name, status, parent } = req.body;
  const allCategories = await Category.find().lean();

  if (!name || name.trim() === '') {
    return res.render('newcategory', {
      error: 'Category name is required',
      category: null,
      allCategories
    });
  }

  const existing = await Category.findOne({ name: name.trim() });
  if (existing) {
    return res.render('newcategory', {
      error: 'A category with this name already exists',
      category: null,
      allCategories
    });
  }

  const validStatus = ['Active', 'Inactive'];
  if (!validStatus.includes(status)) {
    return res.render('newcategory', {
      error: 'Invalid status value',
      category: null,
      allCategories
    });
  }

  let parentId = null;
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return res.render('newcategory', {
        error: 'Invalid parent category',
        category: null,
        allCategories
      });
    }
    parentId = parentCategory._id;
  }

  try {
    const slugBase = slugify(name.trim(), { lower: true, strict: true });
    let slug = slugBase;
    let count = 1;
    while (await Category.findOne({ slug })) {
      slug = `${slugBase}-${count++}`;
    }

    await Category.create({
      name: name.trim(),
      status,
      parent: parentId,
      slug
    });

    res.redirect('/categories');
  } catch (err) {
    console.error('Category creation error:', err.message);
    res.render('newcategory', {
      error: 'Category creation failed: ' + err.message,
      category: null,
      allCategories
    });
  }
});


router.get('/category/edit/:id', ensureAuthenticated, auth.allowCatalogueManager, async (req, res) => {
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

router.post('/category/edit/:id', ensureAuthenticated, auth.allowCatalogueManager, async (req, res) => {
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
  auth.allowCatalogueManager, 
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

router.get('/products', ensureAuthenticated, auth.allowCatalogueManager, async (req, res) => {
  const products = await Product.find().populate('categories').lean();
  const formatted = products.map(p => ({
    ...p,
    categoryNames: p.categories?.length
      ? p.categories.map(c => c.name).join(', ')
      : 'Uncategorized'
  }));
  res.render('products', { products: formatted, error: null });
});

router.get('/product/new', ensureAuthenticated, auth.allowCatalogueManager, async (req, res) => {
  const categories = await Category.find().lean();
  res.render('newproduct', { categories, product: null, error: null });
});

router.post('/product/new', ensureAuthenticated, auth.allowCatalogueManager, upload.array('images'), async (req, res) => {
    try {
      const { name, price, sizes, description, status } = req.body;

      const categories = Array.isArray(req.body.category)
        ? req.body.category
        : [req.body.category];

      const selectedSizes = Array.isArray(sizes) ? sizes : [sizes];

      const images = req.files?.map(file => '/uploads/' + file.filename) || [];

      const product = new Product({
        name,
        price,
        categories,
        images,
        sizes: selectedSizes,
        description,
        status: status || 'Live',
      });

      await product.save();
      res.redirect('/products');
    } catch (err) {
      console.error('Failed to create product:', err);
      res.status(500).send('Failed to create product');
    }
  }
);

router.get('/product/edit/:id', ensureAuthenticated, auth.allowCatalogueManager, async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  const categories = await Category.find().lean();
  if (!product) return res.redirect('/products');
  product.categories = Array.isArray(product.categories)
    ? product.categories.map(id => id.toString())
    : [];
  res.render('newproduct', { product, categories, error: null });
});

router.post('/product/edit/:id', ensureAuthenticated, auth.allowCatalogueManager, upload.array('images'), async (req, res) => {
  try {
    const { name, price, sizes, description } = req.body;
    const categories = Array.isArray(req.body.category) ? req.body.category : [req.body.category];

    const update = {
      name,
      categories,
      price,
      sizes: Array.isArray(sizes) ? sizes : [sizes],
      description,
    };

    if (req.files && req.files.length > 0) {
      update.images = req.files.map(file => '/uploads/' + file.filename);
    }

    await Product.updateOne({ _id: req.params.id }, update);
    res.redirect('/products');
  } catch (err) {
    console.error('Failed to update product:', err);
    res.status(500).send('Failed to update product');
  }
});

router.post('/product/delete/:id', ensureAuthenticated, async (req, res) => {
  const roleName = req.user?.role?.name;
  if (roleName !== 'Admin' && roleName !== 'CatalogueManager') {
    return res.status(403).send('Forbidden: You do not have permission to delete products');
  }
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/products');
  } catch (err) {
    console.error('Failed to delete product:', err);
    res.status(500).send('Failed to delete product');
  }
});


router.get('/roles',auth.allowCatalogueManager, ensureAuthenticated, async (req, res) => {
  try {
    const roles = await Role.find().lean();
    res.render('roles', { roles, error: null });
  } catch (err) {
    console.error(err);
    res.render('roles', { roles: [], error: 'Failed to load roles' });
  }
});

router.get('/roles/new',auth.allowCatalogueManager, ensureAuthenticated, (req, res) => {
  res.render('newrole', { role: null, error: null });
});

router.post('/roles/new',auth.allowCatalogueManager, ensureAuthenticated, async (req, res) => {
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

router.get('/roles/edit/:id',auth.allowCatalogueManager, ensureAuthenticated, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).lean();
    res.render('newrole', { role, error: null });
  } catch (err) {
    console.error(err);
    res.redirect('/roles');
  }
});

router.post('/roles/edit/:id',auth.allowCatalogueManager, ensureAuthenticated, async (req, res) => {
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


router.get('/users',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  try {
    const users = await User.find().populate('role').lean();
    res.render('users', { users, error: null, userInfo: req.user });
  } catch (err) {
    console.error(err);
    res.render('users', { users: [], error: 'Failed to load users' });
  }
});

router.get('/users/new',auth.userAuthentication, ensureAuthenticated, async (req, res) => {
  try {
    const roles = await Role.find().lean();
    res.render('newuser', { user: null, roles, error: null });
  } catch (err) {
    console.error(err);
    res.redirect('/users');
  }
});

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
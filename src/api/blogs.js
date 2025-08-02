const express = require('express');
const router = express.Router();
const Blog = require('../../models/blogs');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const blogs = await Blog.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author"
        }
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "blogcategories",
          localField: "categories",
          foreignField: "_id",
          as: "categories"
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                title: 1,
                image: 1,
                slug: 1,
                excerpt: { $substr: ["$content", 0, 150] }, 
                createdAt: 1,
                updatedAt: 1,
                "author.name": 1,
                categories: "$categories.name"
              }
            }
          ],
          totalCount: [{ $count: "count" }]
        }
      }
    ]);

    const result = blogs[0];
    const total = result.totalCount[0]?.count || 0;

    res.json({
      success: true,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalBlogs: total,
      data: result.data
    });

  } catch (err) {
    console.error('Error fetching blogs:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch blogs',
      message: err.message
    });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate('author', 'name')
      .populate('categories', 'name')
      .select('-__v') 
      .lean();

    if (!blog) {
      return res.status(404).json({ 
        success: false,
        error: 'Blog not found' 
      });
    }

    if (!blog.content || typeof blog.content !== 'string') {
      console.warn('Content missing or invalid for blog:', blog.slug);
      blog.content = '<p>No content available</p>';
    }

    res.json({
      success: true,
      data: blog
    });

  } catch (err) {
    console.error('Error fetching blog:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
});

module.exports = router;
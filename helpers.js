function buildCategoryTree(categories) {
  const map = {};
  categories.forEach(cat => {
    cat.children = [];
    map[cat._id.toString()] = cat;
  });

  const roots = [];
  categories.forEach(cat => {
    if (cat.parent) {
      const parent = map[cat.parent.toString()];
      if (parent) {
        parent.children.push(cat);
      }
    } else {
      roots.push(cat);
    }
  });

  return roots;
}

function renderCategoryRow(category, level = 0, user = null) {
  const prefix = level > 0 ? '-'.repeat(level * 2) + ' ' : '';
  const displayName = `${prefix}${category.name}`;
  const isAdmin = user?.role?.name === 'Admin';

  let row = `
    <tr>
      <td>${displayName}</td>
      <td>${category.status}</td>
      <td>${new Date(category.createdAt).toDateString()}</td>
      <td>
        <a href="/category/edit/${category._id}" class="btn btn-sm btn-warning">Edit</a>
        ${isAdmin ? `
          <form action="/category/delete/${category._id}" method="POST" style="display:inline;">
            <button class="btn btn-sm btn-danger ml-2" onclick="return confirm('Delete this category?')">Delete</button>
          </form>` : ''}
      </td>
    </tr>
  `;

  if (category.children && category.children.length > 0) {
    for (const child of category.children) {
      row += renderCategoryRow(child, level + 1, user);
    }
  }

  return row;
}

module.exports = {
  buildCategoryTree,
  renderCategoryRow
};

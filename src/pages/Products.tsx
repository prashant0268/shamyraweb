import { useState } from 'react';
import { products, categories } from '../data/products';
import ProductCard from '../components/ui/ProductCard';

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category === selectedCategory);

  // Get product count for each category
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return products.length;
    return products.filter(p => p.category === categoryId).length;
  };

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Our Candles</h1>
          <p className="text-gray-600">Handcrafted with love, made to elevate your space</p>
        </div>

        {/* Category Filter */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Filter by:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                const count = getCategoryCount(category.id);
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-800'
                    }`}
                  >
                    {category.name}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-gray-800">{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'product' : 'products'}
            {selectedCategory !== 'all' && (
              <span> in <span className="font-semibold text-amber-700">{categories.find(c => c.id === selectedCategory)?.name}</span></span>
            )}
          </p>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
            >
              <span>✕</span> Clear filter
            </button>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-4">
              No products found in this category.
            </p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-amber-600 hover:text-amber-800 font-medium"
            >
              View all products
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;

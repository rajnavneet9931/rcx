// config/seed.js - Seed database with sample data
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const Product = require('../models/Product');
const Admin = require('../models/Admin');

const sampleProducts = [
  {
    name: 'Dell XPS 15 Laptop',
    category: 'Laptops',
    price: 85000,
    quantity: 15,
    specs: { processor: 'Intel Core i7-12700H', ram: '16GB DDR5', storage: '512GB NVMe SSD', display: '15.6" OLED 3.5K', graphics: 'NVIDIA RTX 3050' },
    description: 'Premium ultrabook with stunning OLED display, perfect for professionals and creatives.',
    image: 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-15-9530/media-gallery/touch-black/notebook-xps-15-9530-t-black-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=320&wid=520&qlt=100,1&resMode=sharp2&size=520,320&chrss=full'
  },
  {
    name: 'MacBook Pro M3 14"',
    category: 'Laptops',
    price: 175000,
    quantity: 8,
    specs: { processor: 'Apple M3 Pro', ram: '18GB Unified', storage: '512GB SSD', display: '14.2" Liquid Retina XDR', graphics: 'Integrated 18-core GPU' },
    description: 'Apple\'s most powerful laptop with the revolutionary M3 Pro chip.',
    image: 'https://cdsassets.apple.com/live/7WUAS350/images/tech-specs/macbook-pro-14-inch-m3-pro-or-m3.png'
  },
  {
    name: 'ASUS ROG Strix G15',
    category: 'Laptops',
    price: 95000,
    quantity: 10,
    specs: { processor: 'AMD Ryzen 9 6900HX', ram: '32GB DDR5', storage: '1TB NVMe SSD', display: '15.6" QHD 165Hz', graphics: 'NVIDIA RTX 3070 Ti' },
    description: 'Ultimate gaming laptop with blazing fast refresh rate and top-tier GPU.',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmN8fmZzsIkfKSJM4dHwyPg0H2JA6UEimu2A&s'
  },
  {
    name: 'ASUS ROG STRIX B550-F Motherboard',
    category: 'Motherboards',
    price: 18500,
    quantity: 20,
    specs: { socket: 'AM4', chipset: 'AMD B550', formFactor: 'ATX', memorySlots: '4x DDR4', maxMemory: '128GB', pcie: 'PCIe 4.0 x16' },
    description: 'High-performance AM4 motherboard with PCIe 4.0 support for AMD Ryzen processors.',
    image: 'https://dlcdnwebimgs.asus.com/files/media/A9730D0E-D1A6-40C1-9282-F1BA1B13BFB4/v1/img/spec/connectivity.jpg'
  },
  {
    name: 'MSI MAG B760 TOMAHAWK',
    category: 'Motherboards',
    price: 22000,
    quantity: 12,
    specs: { socket: 'LGA1700', chipset: 'Intel B760', formFactor: 'ATX', memorySlots: '4x DDR5', maxMemory: '192GB', pcie: 'PCIe 5.0 x16' },
    description: 'Latest Intel LGA1700 motherboard with DDR5 support and PCIe 5.0.',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSZoQTefdxclEXheTRMw2lG_SjEsz0mq3fbw&s'
  },
  {
    name: 'Logitech MX Master 3S Mouse',
    category: 'Accessories',
    price: 8500,
    quantity: 35,
    specs: { sensor: '8000 DPI Optical', connectivity: 'Bluetooth + USB-C', battery: '70 days', buttons: '7 customizable', compatibility: 'Win/Mac/Linux' },
    description: 'The ultimate productivity mouse with silent clicks and precision scrolling.',
    image: 'https://resource.logitech.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-master-3s/gallery/mx-master-3s-mouse-top-view-graphite.png'
  },
  {
    name: 'Keychron K2 Mechanical Keyboard',
    category: 'Accessories',
    price: 9500,
    quantity: 25,
    specs: { switches: 'Gateron Brown', layout: '75% TKL', connectivity: 'Bluetooth 5.1 + USB-C', battery: '4000mAh', backlight: 'RGB LED' },
    description: 'Compact wireless mechanical keyboard perfect for home and office use.',
    image: 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQxrXu1LYzmADbAvyDsxqae8UmEL7e4N3PXknE0vGsdjcLdaUaQ16UAaIwUSMJQa8sj8xQ9hojq3AyMKBnbaCRC7F6BVSqMKnqfQn8_2N1S_1T16LVJcKDS5qM4CQ&usqp=CAc'
  },
  {
    name: 'Samsung 32" 4K Monitor',
    category: 'Accessories',
    price: 35000,
    quantity: 18,
    specs: { resolution: '3840x2160 UHD', panel: 'IPS', refreshRate: '60Hz', ports: 'HDMI 2.0, DP 1.4, USB-C', responseTime: '4ms GTG' },
    description: 'Crystal-clear 4K IPS monitor with wide color gamut for professional use.',
    image: 'https://www.simplyshopping.in/cdn/shop/products/81ImqpXUPtL._SL1500_2048x.jpg?v=1624425626'
  },
  {
    name: 'SanDisk 1TB External SSD',
    category: 'Accessories',
    price: 7800,
    quantity: 40,
    specs: { capacity: '1TB', interface: 'USB 3.2 Gen 2', readSpeed: '1050MB/s', writeSpeed: '1000MB/s', formFactor: 'Portable 2.5"' },
    description: 'Ultra-fast portable SSD with password protection and hardware encryption.',
    image: 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTsqkz28db9424t6AC8UeDraKbB83_Z0Q-Ax2RB4zDCIjTTWM9hKpBzTODM4m8sbaNMkuUPc0RGo6XJbBEGsHrYF8vLWL9HdZqT0BObDh-89jxz_qYXoosD8WwtTITH&usqp=CAc'
  },
  {
    name: 'Corsair Vengeance 32GB DDR5 RAM',
    category: 'Components',
    price: 12000,
    quantity: 30,
    specs: { capacity: '2x16GB', type: 'DDR5', speed: '5600MHz', latency: 'CL36', voltage: '1.25V' },
    description: 'High-performance DDR5 RAM kit optimized for Intel 12th/13th Gen and AMD Ryzen 7000.',
    image: 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQ6kh_p3dpBfqlsOerJnxXnLCaEaSNiuawdzrCsbVCG8SbaqgKoSErhq8HK6cWrd4lhrmFdesScrwJyEvoHV9P74deU5_23VN2qItJLjsigKTAcDlVUL-0&usqp=CAc'
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Product.deleteMany({});
    await Admin.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Insert products
    await Product.insertMany(sampleProducts);
    console.log(`✅ Inserted ${sampleProducts.length} products`);

    // Create admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await Admin.create({
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      name: 'Jeecom IT Admin'
    });
    console.log('✅ Admin user created');
    console.log(`   Email: ${process.env.ADMIN_EMAIL}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD}`);

    console.log('\n🚀 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();

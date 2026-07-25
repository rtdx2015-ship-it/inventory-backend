const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ================== الاتصال بقاعدة البيانات ==================
// تنبيه: تم حذف الرابط المكتوب يدوياً لأسباب أمنية.
// يجب تعريف MONGODB_URI في إعدادات Vercel (Environment Variables) حصرياً.
const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;
  if (!MONGODB_URI) {
    throw new Error('متغير البيئة MONGODB_URI غير معرف في Vercel');
  }
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 8000, // فشل سريع بدل الانتظار الطويل
  });
  isConnected = true;
  console.log('✅ تم الاتصال بـ MongoDB');
};

// ضمان الاتصال قبل كل طلب API — وإيقاف الطلب فوراً لو فشل الاتصال
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    res.status(503).json({ error: 'فشل الاتصال بقاعدة البيانات', details: err.message });
  }
});

// ================== Schemas ==================
// استخدام strict:false للسماح بمرونة الحقول القادمة من الواجهة الأمامية

const ProductSchema = new mongoose.Schema({
  barcode: String,
  nameAr: String,
  nameEn: String,
  category: String,
  imageUrl: String,
  mainUnit: String,
  units: [{ type: mongoose.Schema.Types.Mixed }],
  minStock: Number,
  maxStock: Number,
  costUSD: Number,
  priceUSD: Number,
  wholesalePriceUSD: Number,
  distributorPriceUSD: Number,
  stockByWarehouse: { type: mongoose.Schema.Types.Mixed, default: {} },
  batchNumber: String,
  expiryDate: String,
  serialNumbers: [String],
}, { strict: false, timestamps: true });

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  type: String, // sale | purchase | sale_return | purchase_return
  date: String,
  contactId: String,
  contactName: String,
  warehouseId: String,
  currency: String,
  exchangeRate: Number,
  pricePolicy: String,
  items: [{ type: mongoose.Schema.Types.Mixed }],
  subtotalUSD: Number,
  discountUSD: Number,
  totalUSD: Number,
  totalIQD: Number,
  paidUSD: Number,
  paidIQD: Number,
  remainingUSD: Number,
  paymentStatus: String,
  notes: String,
  returnRefNumber: String,
}, { strict: false, timestamps: true });

const ContactSchema = new mongoose.Schema({
  code: String,
  name: String,
  type: String, // customer | supplier | both
  phone: String,
  address: String,
  creditLimitUSD: Number,
  balanceUSD: Number,
  taxNumber: String,
}, { strict: false, timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);

// ================== Products API ==================
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== Invoices API ==================
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const newInvoice = new Invoice(req.body);
    await newInvoice.save();
    res.status(201).json(newInvoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== Contacts API ==================
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const newContact = new Contact(req.body);
    await newContact.save();
    res.status(201).json(newContact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const updated = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'جهة الاتصال غير موجودة' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== Health check ==================
app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'Inventory Backend API يعمل بشكل صحيح' });
});

module.exports = app;

// Minimal in-memory stand-in for a MongoDB collection: findOne and
// findOneAndUpdate with $set / $inc / $max on dotted paths and upsert,
// following MongoDB's documented semantics. Used by tests only.
function getPath(doc, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), doc);
}

function setPath(doc, path, value) {
  const keys = path.split('.');
  let o = doc;
  for (const k of keys.slice(0, -1)) o = o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {};
  o[keys[keys.length - 1]] = value;
}

class FakeCollection {
  constructor() {
    this.docs = new Map();
  }

  async findOne(filter) {
    const doc = this.docs.get(filter._id);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  async findOneAndUpdate(filter, update, options = {}) {
    let doc = this.docs.get(filter._id);
    const original = doc ? JSON.parse(JSON.stringify(doc)) : null;
    if (!doc) {
      if (!options.upsert) return { value: null };
      doc = { _id: filter._id };
      this.docs.set(filter._id, doc);
    }
    for (const [path, v] of Object.entries(update.$set || {})) setPath(doc, path, v);
    for (const [path, v] of Object.entries(update.$inc || {})) setPath(doc, path, (getPath(doc, path) || 0) + v);
    for (const [path, v] of Object.entries(update.$max || {})) {
      const cur = getPath(doc, path);
      if (cur === undefined || v > cur) setPath(doc, path, v);
    }
    return { value: options.returnOriginal === false ? JSON.parse(JSON.stringify(doc)) : original };
  }
}

module.exports = { FakeCollection };

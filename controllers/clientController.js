exports.addClient = (req, res) => {
  const { name, contact } = req.body;
  // logic to insert into DB
  res.status(200).json({ message: 'Client added successfully' });
};

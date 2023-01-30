const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const app = express();
const mongoose = require("mongoose");
const _ = require("lodash");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
// to load static files
app.use(express.static("public"));

// create db connection
mongoose.connect("mongodb://localhost:27017/todolistDB", {
  useNewUrlParser: true,
});
// Create schema
const itemsSchema = new mongoose.Schema({
  name: String,
});

// create model
const ItemsModel = mongoose.model("Item", itemsSchema);

const item1 = new ItemsModel({
  name: "Welcome to your todolist!",
});

const item2 = new ItemsModel({
  name: "Hit the + button to add a new item.",
});

const item3 = new ItemsModel({
  name: "<-- Hit this to delete an item.",
});

const defaultItems = [item1, item2, item3];
// Create schema for custom list
const listSchema = {
  name: String,
  items: [itemsSchema],
};
const ListModel = mongoose.model("List", listSchema);

app.get("/", function (req, res) {
  ItemsModel.find({}, function (err, results) {
    if (results.length === 0) {
      // insert first elements if our db is empty (first time)
      ItemsModel.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("successfully added to DB");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Today", newListItems: results });
    }
  });
});

app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  ListModel.findOne({ name: customListName }, function (err, results) {
    if (!results) {
      // Create a new list
      const list = new ListModel({
        name: customListName,
        items: defaultItems,
      });
      list.save();
      // redirect new created list
      res.redirect("/" + customListName);
    } else {
      // Show existing list
      console.log("List already exists");
      // render list.ejs
      res.render("list", {
        listTitle: results.name,
        newListItems: results.items,
      });
    }
  });
});

app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  console.log(listName);

  const addItem = new ItemsModel({
    name: itemName,
  });

  if (listName === "Today") {
    addItem.save();
    res.redirect("/");
  } else {
    ListModel.findOne({ name: listName }, function (err, foundList) {
      foundList.items.push(addItem);
      foundList.save();
    });
    res.redirect("/" + listName);
  }
});

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    ItemsModel.findByIdAndRemove(checkedItemId, function (err) {
      if (err) {
        console.log("Item not found");
      } else {
        console.log("Successfully removed");
        res.redirect("/");
      }
    });
  } else {
    ListModel.findOneAndUpdate(
      { name: listName },
      // delete the selected item with $pull
      { $pull: { items: { _id: checkedItemId } } },
      function (err, results) {
        if (!err) {
          res.redirect("/" + listName);
        }
      }
    );
  }
});

app.get("/about", function (req, res) {
  // specify file name
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started");
});

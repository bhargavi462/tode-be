const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const app = express()
app.use(express.json())
app.use(cors())
const dbPath = path.join(__dirname, 'sqlite.db')
let db = null

const connectingDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3030, () => {
      console.log('Server Running')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

connectingDB()

const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'SECRET', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//app.use(authenticateToken)
//register api

app.post('/register', async (request, response) => {
  const {username, email, password} = request.body
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`

  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400).send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(request.body.password, 10)
      const createUserQuery = `
          INSERT INTO 
            users (username, email, password) 
          VALUES 
            (
              '${username}', 
              '${email}',
              '${hashedPassword}');`
      const dbResponse = await db.run(createUserQuery)
      const newUserId = dbResponse.lastID
      response.status(200).send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//log in api
app.get('/getusers/', async (request, response) => {
  //const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM users;`
  const dbUser = await db.get(selectUserQuery)
  response.send(dbUser)
})



app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'SECRET')
      response.status(200).send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//authorization token

const priorityArray = ['HIGH', 'MEDIUM', 'LOW']
const statusArray = ['TO DO', 'IN PROGRESS', 'DONE']
const categoryArray = ['WORK', 'HOME', 'LEARNING']

const hasStatusProperty = (statusArray, status) => statusArray.includes(status)
const hasPriority = (priorityArray, priority) =>
  priorityArray.includes(priority)
const hasCategoryProperty = (categoryArray, category) =>
  categoryArray.includes(category)

const isValiDuedate = item => {
  return isValid(new Date(item))
}

//api
app.get('/todos/', async (req, res) => {
  let getTodoQuery //= `SELECT * FROM todo WHERE 1 = 1;`
  const {search_q = '', status, priority, category} = req.query
  switch (true) {
    case req.query.status !== undefined:
      if (hasStatusProperty(statusArray, status)) {
        getTodoQuery = `SELECT id, todo, priority, status,category, due_date As dueDate FROM todo WHERE todo like '%${search_q}%' and status = "${status}";`
      } else {
        return res.status(400).send('Invalid Todo Status')
      }
      break
    case req.query.priority !== undefined:
      if (hasPriority(priorityArray, priority)) {
        getTodoQuery = `SELECT id, todo, priority, status,category, due_date As dueDate FROM todo WHERE todo like '%${search_q}%' and priority = "${priority}";`
      } else {
        return res.status(400).send('Invalid Todo Priority')
      }
      break
    case req.query.category !== undefined:
      if (hasCategoryProperty(categoryArray, category)) {
        getTodoQuery = `SELECT id, todo, priority, status,category, due_date As dueDate FROM todo WHERE todo like '%${search_q}%' and category = "${category}";`
      } else {
        return res.status(400).send('Invalid Todo Category')
      }
      break
    case req.query.search_q !== undefined:
      getTodoQuery = `SELECT id, todo, priority, status,category, due_date As dueDate FROM todo WHERE todo like '%${search_q}%';`
      break
    default:
      getTodoQuery = `SELECT id, todo, priority, status,category, due_date As dueDate FROM todo WHERE todo like '%${search_q}%';`
      break
  }
  // //sc1
  // if (status) {
  //   if (hasStatusProperty(statusArray, status) === true) {
  //     console.log('hello')
  //     getTodoQuery = `SELECT * FROM todo WHERE status = '${status}';`
  //   } else {
  //     res.status(400).send('Invalid Todo Status')
  //   }
  // }
  // //sc2
  // if (priority) {
  //   if (hasPriority(priorityArray, priority) === true) {
  //     getTodoQuery = `SELECT * FROM todo WHERE priority = '${priority}';`
  //   } else {
  //     res.status(400).send('Invalid Todo Priority')
  //   }
  // }
  // //sc3
  // if (category) {
  //   if (hasCategoryProperty(categoryArray, category) === true) {
  //     getTodoQuery = `SELECT * FROM todo WHERE category = '${category}';`
  //   } else {
  //     res.status(400).send('Invalid Todo Category')
  //   }
  // }
  // //sc4

  // if (category && priority) {
  //   if (
  //     hasCategoryProperty(categoryArray, category) === true &&
  //     hasPriority(priorityArray, priority) === true
  //   ) {
  //     getTodoQuery = `SELECT * FROM todo WHERE priority = '${priority}' AND category = '${category}';`
  //   } else {
  //     res.status(400).send('Invalid Todo Category')
  //   }
  // }
  // //sc5
  // if (category && status) {
  //   if (
  //     hasCategoryProperty(categoryArray, category) === true &&
  //     hasStatusProperty(statusArray, status) === true
  //   ) {
  //     getTodoQuery = `SELECT * FROM todo WHERE status = '${status}' AND category = '${category}';`
  //   } else {
  //     res.status(400).send('Invalid Todo Category')
  //   }
  // }
  // //sc6

  // if (priority && status) {
  //   if (
  //     hasStatusProperty(statusArray, status) === true &&
  //     hasPriority(priorityArray, priority) === true
  //   ) {
  //     getTodoQuery = `SELECT * FROM todo WHERE status = '${status}' AND priority = '${priority}';`
  //   } else {
  //     res.status(400).send('Invalid Todo Category')
  //   }
  // }
  // //sc7
  // if (search_q) {
  //   getTodoQuery = `SELECT * FROM todo WHERE todo = '%${search_q}%';`
  // }

  const todoArray = await db.all(getTodoQuery)
  res.send(todoArray)
})

//get todo based on id

app.get('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const getTodo = `SELECT id, todo, priority, status, category, due_date as dueDate  FROM todo WHERE id = ${todoId};`
  const todo = await db.get(getTodo)
  res.send(todo)
})

//get todobased on due date
app.get('/agenda/', async (req, res) => {
  const {date} = req.query

  if (date === undefined) {
    res.status(400).send('Invalid Due Date')
  } else {
    if (isValiDuedate(date)) {
      const formattedDate = format(new Date(date), 'yyyy-MM-dd')
      console.log(formattedDate)
      const getTodos = `SELECT id, todo, priority, status, category, due_date as dueDate FROM todo WHERE due_date = ?;`
      const todos = await db.all(getTodos, [formattedDate])
      console.log(todos)
      res.send(todos)
    } else {
      res.status(400).send('Invalid Due Date')
    }
  }
})

//insert a todo

app.post('/todos/', async (req, res) => {
  let {id, todo, priority, status, category, dueDate} = req.body

  if (!hasStatusProperty(statusArray, status)) {
    res.status(400).send('Invalid Todo Status')
  } else if (!hasPriority(priorityArray, priority)) {
    res.status(400).send('Invalid Todo Priority')
  } else if (!hasCategoryProperty(categoryArray, category)) {
    res.status(400).send('Invalid Todo Category')
  } else if (!isValiDuedate(dueDate)) {
    res.status(400).send('Invalid Due Date')
  } else {
    dueDate = format(new Date(dueDate), 'yyyy-MM-dd')
    const addTodo = `INSERT INTO todo (id, todo, priority, status, category, due_date)
             VALUES (${id}, '${todo}', '${priority}', "${status}", "${category}", "${dueDate}");`
    let result = await db.run(addTodo)
    console.log(result)
    res.send('Todo Successfully Added')
  }
})

//update a todo
app.put('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const resDetails = req.body
  const {status, category, priority, todo, dueDate} = resDetails
  let message = ''
  let updateColumn = ''

  switch (true) {
    case resDetails.status !== undefined:
      if (hasStatusProperty(statusArray, status)) {
        console.log(status)
        updateColumn = 'status'
        message = 'Status Updated'
      } else {
        return res.status(400).send('Invalid Todo Status')
      }

      break
    case resDetails.todo !== undefined:
      updateColumn = 'todo'
      message = 'Todo Updated'
      break

    case resDetails.category !== undefined:
      if (hasCategoryProperty(categoryArray, category)) {
        updateColumn = 'category'
        message = 'Category Updated'
      } else {
        return res.status(400).send('Invalid Todo Category')
      }
      break
    case resDetails.priority !== undefined:
      if (hasPriority(priorityArray, priority)) {
        updateColumn = 'priority'
        message = 'Priority Updated'
      } else {
        return res.status(400).send('Invalid Todo Priority')
      }
      break
    case resDetails.dueDate !== undefined:
      if (isValiDuedate(dueDate)) {
        updateColumn = 'due_date'
        resDetails[updateColumn] = format(new Date(dueDate), 'yyyy-MM-dd')
        message = 'Due Date Updated'
      } else {
        return res.status(400).send('Invalid Due Date')
      }
      break
  }
  const updateTodo = `UPDATE todo set ${updateColumn} = ? where id = ?;`
  await db.run(updateTodo, [resDetails[updateColumn], todoId])
  res.send(`${message}`)
  //if (key != undefined) updateColumn = key
})

//delete a todo

app.delete('/todos/:todoId/', async (req, res) => {
  const {todoId} = req.params
  const deleteTodo = `DELETE FROM todo WHERE id = ${todoId};`
  await db.run(deleteTodo)
  res.send('Todo Deleted')
})






module.exports = app

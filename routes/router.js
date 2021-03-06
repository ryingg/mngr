
/*
 * Handles all app page routing.
 */

module.exports = function(app) {

  // Get index page
  app.get('/', function(req, res) {
    res.render('index', { title: 'Mngr'})
  })

  // Get sign up page
  app.get('/signup', function(req, res) {
    res.render('signup', { title: 'Mngr'})
  })

  // Get post sign up page
  app.get('/intro', function(req, res) {
    res.render('intro', { title: 'Mngr'})
  })

  // Get home page
  app.get('/home', function(req, res) {
    res.render('home', { title: 'Mngr'})
  })

  app.get('/employee', function(req, res) {
    res.render('employee', { title: 'Mngr'})
  })

  app.get('/about', function(req, res) {
    res.render('about', { title: 'Mngr'})
  })

  app.get('/account', function(req, res) {
    res.render('account', { title: 'Mngr'})
  })

  app.get('/employees', function(req, res) {
    res.render('employees', { title: 'Mngr'})
  })

  app.get('/schedule', function(req, res) {
    res.render('schedule', { title: 'Mngr'})
  })

}
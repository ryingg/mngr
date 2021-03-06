/*
 * Summary:      home.js handles all user interaction (clicks, submits) 
 *               and page loading when the user navigates to the manager page.
 */
var is_manager = true;

var socket = io.connect()
var positions = []
var day_start = 6;
var day_end = 22;
var day_length = day_end - day_start - 1;
var year = 2014;

var unavail_view = false;
var draft_view = false;
var day_view = true;
var initial = true;

var positions=[
]
// {key:1, label:"Chef", color:"#c85248"},
// {key:2, label:"Server", color:"#d5e15d"},
// {key:3, label:"Bartender", color:"#63b7e6"},
// {key:4, label:"Manager", color:"#95b4af"}

var employees = []
var shifts  
var ref_shifts

var unavailability = []

function init()
{ //initliaze the calendar

//getshifts and shit
//get employees
socket.emit('retrieve-calendar', function(err, companyCalendar,
  companyPosition) 
{
  if(!companyCalendar || !companyPosition) { // if the calendars are not retrieved
    console.log('(-) Calendar initialization failed.')
  } 
  else { 

    var today = new Date()

    calendars = new ClientCalendar(companyCalendar)
    ref_calendar = new ClientCalendar(companyCalendar)
    

    getShifts(today)

    // Set the passed in company positions to the global array
    // positions = companyPositions

    scheduler.locale.labels.timeline_tab = "Timeline"
    scheduler.locale.labels.section_custom="Position"
    scheduler.config.details_on_create=true
    scheduler.config.details_on_dblclick=true
    scheduler.config.xml_date="%Y-%m-%d %H:%i"
    scheduler.config.wide_form = false
    scheduler.config.readonly = true

    // Used to sort username in allEmployees.sort() 
    function propertyCompare(prop) {
      return function(a, b) {
          return a[prop] > b[prop]
      }
    }

    socket.emit('retrieve-company-info', function(err, companyInfo)
    {
      if(!err) {
        console.log("yo" + JSON.stringify(companyInfo))
        day_start = companyInfo.hours.day_start 
        day_end = companyInfo.hours.day_end
        day_length = day_end - day_start - 1


        positions = companyInfo.positions
        for( var i = 0; i < positions.length;++i){
        
          $("#sidr-left ul").append('<li><div class="color" id="'+positions[i].label+'""></div><div id="text">'+positions[i].label+'</div></li>')
          document.getElementById(positions[i].label).style.backgroundColor = positions[i].color
        }

      }
    })

    socket.emit('retrieve-all-employees', function(err, allEmployees)
    {
      if(err) {
        console.error('(-) All employees retrieval failed: ' + err.message)

      } else {
        allEmployees.sort(propertyCompare('username'))

        for(var i=0; i<allEmployees.length; ++i) {
          employees.push({
            "key" : allEmployees[i].id,
            "label" : allEmployees[i].username
          })
        }

        //render the colors
        scheduler.templates.event_class = function (start, end, event) 
        {

          if (event.color == "#e7e7e7") {
            //event.text = "UNAVAILABLE";
            return "unavailability"
          }

          else {
            event.color = scheduler.getColor("position_id", event.position_id);
            return "shifts"
          }
        }

        loadDay() //create timeline day

        //lightbox
        scheduler.config.lightbox.sections=[
        //{name:"description", height:50, map_to:"text", type:"textarea" , focus:true}, //POSTIT NOTE FEATURE?
        {name:"custom", height:23, type:"select", options:positions, map_to:"position_id" },
        //{name:"custom", height:200, options:positions, map_to:"position_id", type:"radio", vertical:true },
        //{name:"time", height:72, type:"time", map_to:"auto"}
        ]
          
        scheduler.init('scheduler', today,"timelineday") //init the calendar
        //loadWeek()

        render()

      }
    }) // end of socket emit for retrieve-all-employees
  }
}) // end of callback function

} // end of init()

$(document).ready(function() {

  $('#menu').sidr({
  name: 'sidr-left',
  side: 'left',
  body: '#container',
  displace: true,
  resize: true,
  speed: 100
  });

  $(window).resize(function ()
  {
    $.sidr('close', 'sidr-left');
  });

  $(".dhx_cal_next_button").click(function()
  {
    console.log("next button")
  });

  //show dropdown
  $("#profile").click(function()
  {
    if(document.getElementById("dropdown").style.display == "none" || !document.getElementById("dropdown").style.display)
      document.getElementById("dropdown").style.display = "block"
    else
      document.getElementById("dropdown").style.display = "none"
  })

  //logout user
  $("#d2 a").click(function()
  {
    console.log("Made it to on click")

    socket.emit('logout',function(error)
    {
      //if(error)
      //console.log(error)
      console.log("Made it to logout User")
      window.location.href = '/'
    })
  })

  //publish button
  $("#publish").click(function()
  {
    $.sidr('close', 'sidr-left')

    while(ref_shifts.length > 0) { //clear ref_shifts
      ref_shifts.pop();
    }
    for(var j=0; j<calendars.days.length; ++j) {

      shifts = calendars.days[j].shifts

      var i = 0
      var length = shifts.length
      while(i<length) {
        console.log(i + " " + length)
        if(shifts[i].type == "delete") {
          console.log("delete this one " + shifts[i].text)
          shifts.splice(i,1)
          length--
        }
        else {
          console.log("now at " + shifts[i].text + "at " + i)
          delete shifts[i].type //delete temp
          console.log("dont delete this one " + shifts[i].text)
          i++
        }
      }
    }

    ref_calendar = new ClientCalendar({
      "Days" : calendars.days,
      "Availabilities" : calendars.availabilities
    }) // update ref_calendar
    getShifts(scheduler._date) // reload shifts

    socket.emit('update-calendar', calendars, function(error)
    {
      if(error) { 
        //TODO: There was error while updating calendar. Let the user know
        console.log('there was an error while updating the calendars')
      } else {
        //TODO: The update was done successfully. Let the user know
        console.log('the calendars was updated successfully')
      }
    }) // end of calendar-update

    console.log('im suppose here all the way at the end')
    
    //load published view
    scheduler.parse(ref_shifts,"json")
    scheduler.config.readonly = true
    document.getElementById("draft").style.opacity = ".25"
    document.getElementById("published").style.opacity = "1"

    draft_view = false
    initial = true
    //hideEvents()
    render()

    if(document.getElementById("publish") != null)
    document.getElementById("publish").style.display = "none"

  }) //end of publish function

  //load draft view
  $("#draft").click(function()
  {
    if(sched_loaded) {
      if(this.style.opacity == 0.25 || !this.style.opacity) {
        if(initial) {
          $.sidr('open', 'sidr-left');
          initial = false;
        }
        if(document.getElementById("publish") != null)
          document.getElementById("publish").style.display = "block"
        for(var i = 0;i<shifts.length;i++) {
          shifts[i].start_date = correctDates(shifts[i].start_date)
          shifts[i].end_date = correctDates(shifts[i].end_date)
        }
        scheduler.parse(shifts,"json")
        if(day_view)
          scheduler.config.readonly = false
        document.getElementById("published").style.opacity = ".25"
        this.style.opacity = "1"
        loadDraft()
      }
    }
  });

  $("#published").click(function()
  {
    if(sched_loaded) {
      if(this.style.opacity == 0.25) {
        if(document.getElementById("publish") != null)
          document.getElementById("publish").style.display="none"
          document.getElementById("draft").style.opacity=".25"
          this.style.opacity = "1"
          loadPublished()
      }
    }
  });

  $("#day").click(function()
  {
    //redisplay the unavailability
    scheduler.parse(unavailability,"json")

    if(sched_loaded) {
      if(this.style.opacity == 0.25) {

        loadDay()
        if(draft_view)
          scheduler.config.readonly = false
        document.getElementById("week").style.opacity = ".25"
        this.style.opacity = "1"

        day_view = true;
        //hideEvents()
        render()
      }
    }
  });

  $("#week").click(function()
  {
    if(sched_loaded) {
      if(this.style.opacity == 0.25 || !this.style.opacity) {
        loadWeek()
        
        scheduler.config.readonly = true
        document.getElementById("day").style.opacity = ".25"
        this.style.opacity = "1"

        day_view = false;
  
        // display schedules
        getShiftsForWeek(scheduler._date)
        render()
        //hideEvents()
      }
    }
  });
});

//function to get the shifts from database
function getShifts(today)
{
  shifts = calendars.getDay(today).shifts 
  unavailability = calendars.getDay(today).unavailabilities
  ref_shifts = ref_calendar.getDay(today).shifts 

  for(var i = 0;i<shifts.length;i++) {
    shifts[i].start_date = correctDates(shifts[i].start_date)
    shifts[i].end_date = correctDates(shifts[i].end_date)
  }

  for(var i = 0;i<unavailability.length;i++) {
    unavailability[i].start_date = correctDates(unavailability[i].start_date)
    unavailability[i].end_date = correctDates(unavailability[i].end_date)
    unavailability[i].text = ""
  }
}

function getShiftsForWeek(today) 
{
  console.log('im here suckers')
  var week = calendars.getWeek(today)
  var ref_week = ref_calendar.getWeek(today)

  
  shifts = []
  ref_shifts = []

  for(var i=0; i<7; ++i) {
    shifts = shifts.concat(week[i].shifts)
    ref_shifts = ref_shifts.concat(ref_week[i].shifts)

    if(i==6) {
      for(var j = 0;j<shifts.length;j++) {
        shifts[j].start_date = correctDates(shifts[j].start_date)
        shifts[j].end_date = correctDates(shifts[j].end_date)
      }
    }
  }
}

//function to parse and render
function render()
{
  //parse events
  scheduler.parse(unavailability,"json")
  scheduler.parse(shifts,"json")

  if(!day_view) {
    //don't show unavailability
    for(i=0;i<unavailability.length;i++){
      scheduler.hideEvent(unavailability[i].id, true)
    }
  }

  if(!draft_view)
    loadPublished()
  else
    loadDraft()

  //don't show deleted
  for(var i = 0;i<shifts.length;i++) {
    if(shifts[i].type == "delete") {
      scheduler.hideEvent(shifts[i].id, true)
      console.log("delete this " + shifts[i].text)
    }
  }

  console.log("rendered")

}

//function to load draft view
function loadDraft()
{
  draft_view = true;
  if(day_view) {
    //show unavailability
    for(i=0;i<unavailability.length;i++){
      scheduler.addEvent(unavailability[i])
    }

    //make unavailability read only
    var un_events = document.getElementsByClassName("dhx_cal_event_line unavailability")
    for(var i = 0;i<un_events.length;i++) {
      var eventID = scheduler.getEvent(unavailability[i].id)
      eventID.readonly = true
    }

    //disable click for read only events
    scheduler.attachEvent("onDblClick", function (id, e)
    {
      var eventID = scheduler.getEvent(id);
      if(eventID != null)
        if(eventID.readonly)
          return false
      return true
      })

    //disable drag for read only events
    scheduler.attachEvent("onBeforeDrag", function (id, mode, e)
    {
      var eventID = scheduler.getEvent(id);
      if(eventID != null)
        if(eventID.readonly)
          return false
      return true
    })
  }
  
  //don't show published shifts
  for(i=0;i<ref_shifts.length;i++){
    scheduler.hideEvent(ref_shifts[i].id, true)
  }

  //show draft shifts but not deleted ones
  for(i=0;i<shifts.length;i++){
    if(shifts[i].type != "delete")
      scheduler.addEvent(shifts[i])
  }

}

//function to load published view
function loadPublished()
{

  draft_view = false;
  //parse correct date
  for(var i = 0;i<ref_shifts.length;i++) {
    ref_shifts[i].start_date = correctDates(ref_shifts[i].start_date)
    ref_shifts[i].end_date = correctDates(ref_shifts[i].end_date)
    //ref_shifts[i].type = "old"
  }
  scheduler.parse(ref_shifts,"json")
  scheduler.config.readonly = true

  //don't show unavailability
  for(i=0;i<unavailability.length;i++){
    scheduler.hideEvent(unavailability[i].id, true)
  }

  //don't show draft shifts
  for(i=0;i<shifts.length;i++){
    scheduler.hideEvent(shifts[i].id, true)
  }

  //show published shifts
  for(i=0;i<ref_shifts.length;i++){
    scheduler.addEvent(ref_shifts[i])
  }

  //correct shifts pointer for initial published view
  var shift_events = document.getElementsByClassName("dhx_cal_event_line shifts")
  for(var i = 0;i<shift_events.length;i++) {
    shift_events[i].style.cursor="default"
  }
}


//function to load day view
function loadDay()
{
  scheduler.createTimelineView({
  name: "timelineday",
  x_unit:  "minute",
  x_date:  "%g %A", //24hr "%H:%i"
  x_step:  60,
  x_size: day_length+1,
  x_start: day_start,
  x_length: 24,
  y_unit:  employees,
  y_property: "employee_id",
  render:"bar",
  resize_events: false,
  fit_events: false,
  round_position: false,
  })
  scheduler.init('scheduler',scheduler._date,"timelineday")
  console.log("day loaded")
}

function loadWeek()
{
  //don't show unavailability for week view
  for(i=0;i<unavailability.length;i++){
    scheduler.deleteEvent(unavailability[i].id, true)
  }
  //create timeline week
  scheduler.createTimelineView({
  name: "timelineweek",
  x_unit:  "day",
  x_date:  "%l", //24hr "%H:%i"
  x_step:  1, //must be dynamic
  x_size: 7, //HARDCODED
  x_start: 0,
  x_length: 7,
  y_unit:  employees,
  y_property: "employee_id",
  render:"bar",
  resize_events: true,
  fit_events: true,
  round_position: true,
  })
  scheduler.init('scheduler', scheduler._date,"timelineweek")
}

//function to format the correct date when loading data
function correctDates(event_date) 
{
  var date
  if(typeof event_date == 'string' && event_date.length < 16) {
    var dateInfo = event_date.split(' ')
    var dateString = dateInfo[0].split("-")
    date = new Date(dateString[0], dateString[1]-1, dateString[2])
    var time = dateInfo[1].split(':')
    date.setHours(time[0])
    date.setMinutes(time[1])

  } else {
    date = new Date(event_date) 
  }
  return date.getFullYear() + "-" + (date.getMonth() + 1) + "-"
           + date.getDate() + " " + date.getHours() + ":" 
           + date.getMinutes()

}
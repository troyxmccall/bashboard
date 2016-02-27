Router.configure({
  layoutTemplate: 'layout'
});

Router.route('/', {
  name: 'dashboard',
  waitOn: function() {
    if (!Meteor.user()) {
      return false;
    } else {
      return [
        Meteor.subscribe("projects"),
        Meteor.subscribe("people")
      ]
    }
  },
  data: function() {return {
      projects: Projects.find({}),
      people: People.find({}, {
        id: 1,
        name: 1,
        avatar_url: 1
      })
    }
  }
});

var requireLogin = function() {
  if (!Meteor.user()) {
    this.render('notLoggedIn');
  } else {
    this.next();
  }
}

if (Meteor.isClient) {
  Router.onBeforeAction(requireLogin);
}

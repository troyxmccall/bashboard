Meteor.publish('projects', function() {
  console.log('publishing projects');
  if (!this.userId) return false;
  console.log('found user');
  return Projects.find({}, {
    fields: {
      'type': 1,
      'title': 1,
      'app_url': 1,
      'remaining_count': 1,
      'completed_count': 1,
      'issues_count': 1,
      'accesses': 1
    }
  });
});

Meteor.publish('people', function() {
  if (!this.userId) return false;
  return People.find({}, {
    name: 1,
    avatar_url: 1
  });
});

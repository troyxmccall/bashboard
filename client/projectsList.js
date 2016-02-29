Template.projectsList.helpers({
  "completion_per": function() {
    if ((this.remaining_count + this.completed_count) != 0) {
      return Math.round(this.completed_count * 100 / (this.remaining_count + this.completed_count));
    } else {
      return 100;
    }
  },

  "todos": function() {
    return this.completed_count + "/" + (this.remaining_count + this.completed_count);
  },

  "issues": function() {
    return (this.issues_count > 0) ?
      '<a class="btn btn-danger" href="' + this.app_url + '">Issues <span class="badge">' + this.issues_count + '</span></a>' :
      '<a class="btn btn-success" href="' + this.app_url + '">Issues <span class="badge">0</span>';
  },

  "accesses": function() {
    return displayAccesses(this.accesses);
  }
});

var displayAccesses = function(people) {

  var html = '';
  if (people) {
    people.forEach(function(personId) {
      person = People.findOne({
        id: personId
      });
      html += '<img alt="' + person.name + '" src="' + person.avatar_url + '"> ';
    });
  }
  return html;
}

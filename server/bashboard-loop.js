var projects;

// How often to poll Basecamp server for updates.
// Default, 10 seconds. This might change based on server response.
var pollIntervalDefault =
  (typeof Meteor.settings.bashboard.pollIntervalDefault === "undefined") ? 1000 * 10 : Meteor.settings.bashboard.pollIntervalDefault;

// Check that Basecamp settings are defined in settings.json
Basecamp.checkSettings();

// Keep projects collection updated by querying Basecamp API on a timer.
var pollInterval = pollIntervalDefault;

Meteor.setInterval(function() {
  // Bashboard.updateBashboard(active = true);
  // Bashboard.updateBashboard(active = false);

  // get active projets
  projectsActive = Basecamp.getProjects();
  console.log(projectsActive);
  // get archived projects
  projectsArchived = Basecamp.getProjectsArchived();

  // If active and archived have updates we want to combined the two
  // and update at the same time. Why? Sometimes a project moves from
  // active to archived (or the other way) and so we don't want to delete
  // it if that's the case. We just want to update it.
  if (projectsActive.statusCode === 200 && projectsArchived.statusCode === 200) {
    // combined projects
    projects = Bashboard.combineProjects(projectsActive, projectsArchived);
    Bashboard.updateBashboard(projects, active = -1);
  } else if (projectsActive.statusCode === 200) {
    // active projects
    Bashboard.updateBashboard(projectsActive, active = 1);
  } else if (projectsArchived.statusCode === 200) {
    // archived projects
    Bashboard.updateBashboard(projectsArchived, active = 0);
  }
}, pollInterval);

Bashboard = {};

// console logging
Bashboard.statusLog = function(response, statusText) {
  console.log(statusText + ' [' + response.statusCode + ']');
}

// issuesListName
// Name of TODO list in Basecamp projects will be used to indicate issues.
issuesListName = function() {
  return (typeof Meteor.settings.bashboard.issuesListName === "undefined") ? "ISSUES" : Meteor.settings.bashboard.issuesListName;
}

// Update Bashboard
Bashboard.updateBashboard = function(projects, active) {
  if (active == -1) {
    Bashboard.statusLog(projects, '####################################');
    Bashboard.statusLog(projects, 'BASECAMP: PROJECTS COMBINED');
  } else if (active == 1) {
    // projects = Basecamp.getProjects();
    Bashboard.statusLog(projects, '####################################');
    Bashboard.statusLog(projects, 'BASECAMP: PROJECTS ACTIVE');
  } else {
    // projects = Basecamp.getProjectsArchived();
    Bashboard.statusLog(projects, '####################################');
    Bashboard.statusLog(projects, 'BASECAMP: PROJECTS ARCHIVED');
  }

  if (projects.statusCode === 200) {
    // Projects changes have been sent from Basecamp API, so let's make
    // updates based on this new information.

    var project_ids = []; // id tracking for deletion

    projects.data.forEach(function(project) {
      console.log(project);
      // Update Projects
      if (!Bashboard.updateProject(project))
        return false;
      // false indicates Basecamp project name is not conforming
      // return false, skips remainder of forEach

      // Add Project ID to array for removeProjects call later
      project_ids.push(project.id);

      console.log('BASECAMP: ' + project.name + '[' + project.id + ']');

      // Query for Project Accesses (People with Access)
      accesses = Basecamp.getAccesses(project);
      Bashboard.statusLog(accesses, 'BASECAMP: ACCESSES');
      if (accesses.statusCode === 200)
        Bashboard.updateAccesses(project, accesses);

      // Query for Project Todoslists
      todolists = Bashboard.getTodolists(project);
      Bashboard.statusLog(todolists, 'BASECAMP: TODOLISTS');
      if (todolists.statusCode === 200) {
        Bashboard.updateTodoTotals(project, todolists);

        // Search Todolists for "ISSUES" todolist. Grab Todos.
        issues = Bashboard.getIssues(project, todolists);
        Bashboard.statusLog(issues, 'BASECAMP: ISSUES');
        if (issues.statusCode === 200)
          Bashboard.updateIssues(project, issues);
        if (!issues)
          Bashboard.removeIssues(project);
      }
    });

    // Remove projects no longer appearing in Basecamp
    Bashboard.removeProjects(project_ids, active);
    console.log('BASECAMP: REMOVING PROJECTS');
  }
}

// Get Projects | Active and Archived Combined
Bashboard.getProjects = function() {
  var projects;
  var projectsActive = Basecamp.getProjects();
  var projectsArchived = Basecamp.getProjectsArchived();

  projects = projectsActive;

  console.log(projects);

  if (projectsActive.statusCode === 200 || projectsArchived.statusCode === 200)
    projects.statusCode = 200;

  if (projectsArchived.data) {
    projects.data = projectsActive.data.concat(projectsArchived.data);
  }

  return projects;
}

// combine projects data projects1 and projects2
Bashboard.combineProjects = function(projects1, projects2) {
  var projects = projects1;
  projects.data = projects1.data.concat(projects2.data);
  return projects;
}

// Update Project
// Basecamp Projects (that we're tracking in Bashboard) are either COURSES
// or PROJECTS. Basecamp Project names should conform to the following
// naming convention:
//
// Projects:
// {client_name} : {project_name} : {year?}
Bashboard.updateProject = function(project) {


  Projects.upsert({
    // selector
    id: project.id
  }, {
    // modifier
    $set: {
      id: project.id,
      name: project.name,
      description: project.description,
      title: project.title,
      type: project.type,
      archived: project.archived,
      is_client_project: project.is_client_project,
      created_at: project.created_at,
      updated_at: project.updated_at,
      trashed: project.trashed,
      color: project.color,
      draft: project.draft,
      template: project.template,
      last_event_at: project.last_event_at,
      starred: project.starred,
      url: project.url,
      app_url: project.app_url
    }
  });

  return true;
}

// Remove Projects
// - Remove all Projects not appearing in project_ids array.
// - Remove all Issues not associated with projects in project_ids array.
Bashboard.removeProjects = function(project_ids, active) {
  // Remove all Projects not appearing in project_ids array.
  if (active == -1) {
    // active and archived
    Projects.remove({
      id: {
        $nin: project_ids
      }
    });
  } else if (active == 1) {
    // active
    Projects.remove({
      id: {
        $nin: project_ids
      },
      "archived": false
    });
  } else {
    // archived
    Projects.remove({
      id: {
        $nin: project_ids
      },
      "archived": true
    });
  }

  // Remove all Issues not associated with projects in project_ids array.
  if (active == -1) {
    // active and archived
    Issues.remove({
      project_id: {
        $nin: project_ids
      }
    });
  } else if (active == 1) {
    // active
    Issues.remove({
      project_id: {
        $nin: project_ids
      },
      "archived": false
    });
  } else {
    // archived
    Issues.remove({
      project_id: {
        $nin: project_ids
      },
      "archived": true
    });
  }

}

// Update a Project's Accesses
Bashboard.updateAccesses = function(project, accesses) {
  var accesses_ids = []; // id tracking for deletion

  accesses.data.forEach(function(access) {
    if (access.name === Meteor.settings.basecamp.botName) {
      return false; // don't add "bot" account to Accesses
    }

    accesses_ids.push(access.id);

    // Use Accesses to Update People Collection
    People.upsert({
      // selector
      id: access.id
    }, {
      // modifier
      $set: {
        id: access.id,
        name: access.name,
        email_address: access.email_address,
        admin: access.admin,
        identity_id: access.identity_id,
        avatar_url: access.avatar_url,
        fullsize_avatar_url: access.fullsize_avatar_url,
        url: access.url,
        app_url: access.app_url
      }
    });

    // Add Accesses (People) to Project
    Projects.update({
      id: project.id
    }, {
      $addToSet: {
        accesses: access.id
      }
    });
  });

  // Delete Accesses (Prople) from Project
  Projects.update({
    id: project.id
  }, {
    $pull: {
      accesses: {
        $nin: accesses_ids
      }
    }
  });
}

// Get Active and Completed Todo Lists
Bashboard.getTodolists = function(project) {
  var todolists;
  var todolistsActive = Basecamp.getTodolists(project);
  var todolistsCompleted = Basecamp.getTodolistsCompleted(project);

  todolists = todolistsActive;

  if (todolistsActive.statusCode === 200 || todolistsCompleted.statusCode === 200)
    todolists.statusCode = 200;

  if (todolistsCompleted.data) {
    todolists.data = todolistsActive.data.concat(todolistsCompleted.data);
  }

  return todolists;
}

// Update Todo Totals, # of Remaining & Completed
Bashboard.updateTodoTotals = function(project, todolists) {
  remaining_count = 0;
  completed_count = 0;

  todolists.data.forEach(function(todolist) {
    remaining_count += todolist.remaining_count;
    completed_count += todolist.completed_count;
  });

  Projects.upsert({
    // selector
    id: project.id
  }, {
    // modifier
    $set: {
      remaining_count: remaining_count,
      completed_count: completed_count
    }
  });
}

// Issues List | Get "ISSUES" To-Do List for Project
// TODO Move this into Bashboard Package.
Bashboard.getIssues = function(project, todolists) {
  var issues = false;

  todolists.data.forEach(function(todolist) {
    if (todolist.name === issuesListName()) {
      issues = Basecamp.getTodos(project, todolist);
    }
  });

  return issues;
}

// Update Issues, remove deleted issues, update project issues number
Bashboard.updateIssues = function(project, issues) {
  var issue_ids = []; // id tracking for deletion

  // Add/Update Remaining (Open) Issues to Issues Collection
  issues.data.todos.remaining.forEach(function(issue) {
    issue_ids.push(issue.id);

    Issues.upsert({
      // selector
      project_id: project.id,
      id: issue.id
    }, {
      project_id: project.id,
      id: issue.id,
      position: issue.position,
      content: issue.content,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      creator_id: issue.creator.id,
      creator_name: issue.creator.name,
      creator_avatar_url: issue.creator.avatar_url,
      creator_fullsize_avatar_url: issue.creator.fullsize_avatar_url,
      url: issue.url,
      app_url: issue.app_url
    });
  });

  // Remove Any Issues Not Appearing in Basecamp
  Issues.remove({
    project_id: project.id,
    id: {
      $nin: issue_ids
    }
  });

  // Update Project with Number of Issues
  Projects.update({
    // selector
    id: project.id
  }, {
    // modifier
    $set: {
      issues_count: issue_ids.length
    }
  });
}

Bashboard.removeIssues = function(project) {
  // Remove all issues related to project
  Issues.remove({
    project_id: project.id
  });

  Projects.update({
    // selector
    id: project.id
  }, {
    // modifier
    $set: {
      issues_count: 0
    }
  });
}

Bashboard.showProjects = function() {
  var projects = Projects.find({});
  projects.forEach(function(project) {
    console.log(project);
  });
}

Accounts.config({
  restrictCreationByEmailDomain: function(address) {
    if (!Meteor.settings.allowed_accounts) return false;

    // limit access to specified accounts
    var allowed_accounts = Meteor.settings.allowed_accounts;
    return allowed_accounts.indexOf(address) > -1;
  }
});

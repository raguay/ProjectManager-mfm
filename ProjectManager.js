
const ProjectManager = {
  extMan: null,
  html: '',
  cdir: '',
  pjFile: '',
  log: true,
  noteDir: '',
  noteExt: '.md',
  ExtName: 'ProjectManager',
  prefName: 'projectmanager.json',
  init: function(extManager) {
    ProjectManager.extMan = extManager;

    //
    // Load the Preferences for the extension.
    //
    ProjectManager.loadPrefs();

    //
    // Add to the Extra Panel processing.
    //
    ProjectManager.extMan.getExtCommand('addExtraPanelProcessor').command(ProjectManager);
    ProjectManager.extMan.getExtCommand('addDirectoryListener').command(ProjectManager.DirListener);
    var cmds = ProjectManager.extMan.getCommands();

    //
    // Setup the logging commands.
    //
    cmds.addCommand('PM: Turn Logging On', 'ProjectManager.logOn', 'Turn logging on for scripts in the Project Manager.', ProjectManager.logOn);
    cmds.addCommand('PM: Turn Logging Off', 'ProjectManager.logOff', 'Turn logging off for scripts in the Project Manager.', ProjectManager.logOff);

    //
    // Add commands for the notes.
    //
    cmds.addCommand('PM: Create a Note', 'ProjectManager.createProjNote', 'Create a note in the project\'s note directory.', ProjectManager.createProjNote);
    cmds.addCommand('PM: Open a Note', 'ProjectManager.openNote', 'Open a note in the project\'s note directory.', ProjectManager.openNote);
    cmds.addCommand('PM: Open a File Note', 'ProjectManager.openFileNote', 'Open the note for the current file in the project.', ProjectManager.openFileNote);
    cmds.addCommand('PM: Set note extension', 'ProjectManager.setNoteExt', 'Set the extension for note files.', ProjectManager.setNoteExt);

    //
    // Add commands for creating and going to projects.
    //
    cmds.addCommand('PM: Go to Project','ProjectManager.goto', 'Go to a project.', ProjectManager.goto);
    cmds.addCommand('PM: Make a Project', 'ProjectManager.make', 'Use the current directory as a project.', ProjectManager.create);
    cmds.addCommand('PM: Remove a Project', 'ProjectManager.remove', 'Delete a project from the project list.', ProjectManager.remove);

    //
    // Add Template Commands.
    //
    cmds.addCommand('PM: Install Template','ProjectManager.installTemplate','Install a template to the current cursor directory.', ProjectManager.installTemplate);
    cmds.addCommand('PM: Make a Local Template','ProjectManager.makeLocalTemplate','Creates a new template from the directory of the current cursor.', ProjectManager.makeLocalTemplate);
    cmds.addCommand('PM: Make a Web Template','ProjectManager.makeWebTemplate','Creates a new template from the given GitHub template name.', ProjectManager.makeWebTemplate);
    cmds.addCommand('PM: Remove a Template','ProjectManager.removeTemplate','Removes the selected template.', ProjectManager.removeTemplate);
    cmds.addCommand('PM: Go to Template', 'ProjectManager.gotoTemplate', 'Opens a Template Folder', ProjectManager.gotoTemplate);
  },
  installKeyMaps: function() {
  },
  check: function(dir, name, cfs, side) {
    if((typeof dir !== 'undefined')) {
      dir = dir.toString();
      if((ProjectManager.pjFile !== '') && (ProjectManager.cdir !== '') && (dir.includes(ProjectManager.cdir))) return(true);
      ProjectManager.pjFile = '';
      ProjectManager.html = '';
      var fs = ProjectManager.extMan.getLocalFS();
      if(fs !== null) {
        try {
          ProjectManager.pjFile = fs.appendPath(dir,'.startproject');
          if(fs.fileExists(ProjectManager.pjFile)) {
            ProjectManager.cdir = dir;
            ProjectManager.noteDir = fs.appendPath(dir,'.notes');
            if(!fs.fileExists(ProjectManager.noteDir)) {
              fs.makedir(ProjectManager.noteDir);
            }
            return(true);
          }
        }catch(e) {
          ProjectManager.pjFile = '';
          ProjectManager.logToUser("An error checking for a project.");
        }
      }
      ProjectManager.pjFile = '';
      ProjectManager.html = '';
      ProjectManager.cdir = '';
      ProjectManager.noteDir = '';
    }
    return(false);
  },
  createHTML: function() {
    if(ProjectManager.html === '') {
      //
      // Generate the script block.
      //
      globalThis.ProjectManager = ProjectManager;

      // 
      // Get the local file system.
      // 
      var lfs = ProjectManager.extMan.getLocalFS();

      //
      // Get the current theme colors.
      // 
      var theme = ProjectManager.extMan.getExtCommand('getTheme').command();
      
      // 
      // Create the HTML for this project.
      // 
      var html = `
<div id="ProjectManager" style="display: flex; flex-direction: column;">
  <h2>Project Manager</h2>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.runScript()">Run Script</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.editScript()">Edit Script</button>
      `;
      const mfile = lfs.appendPath(ProjectManager.cdir,'maskfile.md');
      if(lfs.fileExists(mfile)){
        //
        // There is a mask file. Offer to edit it or run a script in it.
        // 
        html += `
<button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.editMaskFile()">Edit MaskFile</button>
        `;
        var mfileContent = new String(lfs.readFile(mfile));
        var headerReg = /## (.*)/g;
        var match = [...mfileContent.matchAll(headerReg)];
        for(let i = 0;i<match.length;i++) {
          html += `
<button style="border-radius: 10px;  background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.runMaskFile('${match[i][1]}')">
  Run ${match[i][1]} MaskFile Script
</button>
          `;
        }
      }
      const nfile = lfs.appendPath(ProjectManager.cdir,'package.json');
      if(lfs.fileExists(nfile)){
        //
        // There is a npm file. Offer to edit it or run a script in it.
        // 
        html += `
<button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.editNpmFile()">Edit Npm File</button>
        `;
        var nfileContent = JSON.parse(lfs.readFile(nfile));
        var keys = Object.keys(nfileContent.scripts);
        for(let i = 0; i < keys.length; i++) {
          html += `
<button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.runNpmFile('${keys[i]}')">
  Run ${keys[i]} Npm Script
</button>
          `;
        }
      }
      html += `
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.openNote()">Open a Project Note</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.createProjNote()">Create a Project Note</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.openFileNote()">Open a File Note</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.remove()">Remove a Project</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.create()">Create a Project</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.makeLocalTemplate()">Create a Local Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.makeWebTemplate()">Create a Web Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.installTemplate()">Install a Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.gotoTemplate()">Go to a Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.removeTemplate()">Remove a Template</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.logOn()">Show Script Output</button>
  <button style="border-radius: 10px; background-color: ${theme.textColor}; text: ${theme.backgroundColor}" onclick="globalThis.ProjectManager.logOff()">Hide Script Output</button>
      `;
      html += `</div>`;
      ProjectManager.html = html;
    }
    return(ProjectManager.html);
  },
  after: function() {
    
  },
  DirListener: function(dir) {
    ProjectManager.check(dir,'',{},'side');
  },
  runScript: function() {
    ProjectManager.extMan.localFS.runCommandLine("'" + ProjectManager.pjFile + "' '" + ProjectManager.cdir + "'", (err,stdout) => {
      if(err) {
        ProjectManager.logToUser(err);
      } else {
        ProjectManager.logToUser(stdout);
      }
    });
  },
  editScript: function () {
    ProjectManager.extMan.getExtCommand('editEntryCommand').command(ProjectManager.pjFile);
  },
  editMaskFile: function() {
    ProjectManager.extMan.getExtCommand('editEntryCommand').command(ProjectManager.extMan.getLocalFS().appendPath(ProjectManager.cdir,'maskfile.md'));
  },
  editNpmFile: function() {
    ProjectManager.extMan.getExtCommand('editEntryCommand').command(ProjectManager.extMan.getLocalFS().appendPath(ProjectManager.cdir,'package.json'));
  },
  runMaskFile: function(command) {
    ProjectManager.extMan.localFS.runCommandLine(`mask ${command}`, (err,stdout) => {
      if(err) {
        ProjectManager.logToUser(err);
      } else {
        ProjectManager.logToUser(stdout);
      }
    }, {}, {
      cwd: ProjectManager.cdir
    });
  },
  runNpmFile: function(command) {
    ProjectManager.extMan.localFS.runCommandLine(`npm run ${command}`, (err,stdout) => {
      if(err) {
        ProjectManager.logToUser(err);
      } else {
        ProjectManager.logToUser(stdout);
      }
    },{},{
      cwd: ProjectManager.cdir
    });
  },
  logToUser: function(msg) {
    if(ProjectManager.log) {
      ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', msg);
    }
  },
  logOn: function() {
    ProjectManager.log = true;
    ProjectManager.savePrefs();
  },
  logOff: function() {
    ProjectManager.log = false;
    ProjectManager.savePrefs();
  },
  getProjDirFile: function() {
    var fs = ProjectManager.extMan.getLocalFS();
    var pjf = fs.appendPath(fs.getHomeDir(), '.projects');
    if(fs.fileExists(pjf)) return(pjf);
    pjf = fs.appendPath(fs.getConfigDir(), '.projects');
    return(pjf);
  },
  goto: function() {
    ProjectManager.getProjDir('Which Project?', ProjectManager.getProjDirFile(), (result) => {
      var fs = ProjectManager.extMan.getLocalFS();
      var path = fs.normalize(result);
      ProjectManager.extMan.getExtCommand('changeDir').command({
        path: path
      });
    });
  },
  getProjNote: function(title, pfile, returnFun) {
    var fs = ProjectManager.extMan.getLocalFS();
    var projs = fs.getDirList(pfile);
    var nfiles = [];
    projs.forEach(item => {
      nfiles.push({
        name: item.name,
        value: item
      });
    });
    if(projs.length > 0) ProjectManager.extMan.getExtCommand('pickItem').command(title,nfiles,returnFun);
    else ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager','Sorry, no project notes yet.');
  },
  getProjDir: function(title, pfile, returnFun) {
    var fs = ProjectManager.extMan.getLocalFS();
    var projs = fs.readFile(pfile);
    projs = new String(projs).split('\n');
    var dirs = [];
    projs.forEach(proj => {
      if(proj.includes('|')) {
        var part = proj.split('|');
        dirs.push({
          name: part[0],
          value: part[1]
        })
      }
    });
    if(dirs.length > 0) ProjectManager.extMan.getExtCommand('pickItem').command(title,dirs,returnFun);
    else ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager','Sorry, no projects defined yet.');
  },
  create: function() {
      ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager','What is the project\'s name?', (result) => {
      var pjf = ProjectManager.getProjDirFile();
      var cur = ProjectManager.extMan.getExtCommand('getCursor').command();
      var fs = ProjectManager.extMan.getLocalFS();
      var projs = fs.readFile(pjf);
      projs = new String(projs).split('\n');
      projs.push(result.trim() + '|' + cur.entry.dir);
      projs = projs.filter(item => {
        if(item.includes('|')) return(true);
        return(false);
      });
      fs.writeFile(pjf, projs.join('\n'));
      fs.createFile({
        dir: cur.entry.dir,
        name: '.startproject'
      });
    });
  },
  remove: function() {
    var pjf = ProjectManager.getProjDirFile();
    ProjectManager.getProjDir('Which Project?', pjf, (result) => {
      var fs = ProjectManager.extMan.getLocalFS();
      var path = fs.normalize(result);
      var projs = fs.readFile(pjf);
      projs = new String(projs).split('\n');
      projs = projs.filter(proj => {
        if(proj.includes('|')) {
          var part = proj.split('|');
          if(part[1] === path) return(false);
          else return(true);
        }
      });
      fs.writeFile(pjf, projs.join('\n'));
    });
  },
  openNote: function() {
    if(ProjectManager.noteDir !== '') {
      ProjectManager.getProjNote('Which Note?', ProjectManager.noteDir, result => {
        ProjectManager.extMan.getExtCommand('editEntryCommand').command(result);
      });
    } else {
      ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Project directory not set.')
    }
  },
  openFileNote: function() {
    if(ProjectManager.noteDir !== '') {
      var cur = ProjectManager.extMan.getExtCommand('getCursor').command();
      var entry = cur.entry + ProjectManager.noteExt;
      entry.dir = ProjectManager.noteDir;
      var fs = ProjectManager.extMan.getLocalFS();
      if(!fs.fileExists(entry)) fs.createFile(entry);
      ProjectManager.extMan.getExtCommand('editEntryCommand').command(entry);
    } else {
      ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Project directory not set.')
    }
  },
  createProjNote: function() {
    if(ProjectManager.noteDir !== '') {
      ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager','What is the note\'s name?', (result) => {
        var fs = ProjectManager.extMan.getLocalFS();
        fs.createFile({
          dir: ProjectManager.noteDir, 
          name: result.trim(),
          fileSystem: fs
        });
        ProjectManager.extMan.getExtCommand('editEntryCommand').command({
          dir: ProjectManager.noteDir, 
          name: result.trim(),
          fileSystem: fs
        });
      });
    } else {
      ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager', 'Project directory not set.')
    }
  },
  setNoteExt: function() {
    ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager','What is the note\'s name?', (result) => {
      ProjectManager.noteExt = result.trim();
      ProjectManager.savePrefs();
    });
  },
  savePrefs: function() {
    var fs = ProjectManager.extMan.getLocalFS();
    var pjf = fs.appendPath(fs.getConfigDir(), ProjectManager.prefName);
    fs.writeFile(pjf,JSON.stringify({
      log: ProjectManager.log,
      ext: ProjectManager.noteExt
    }));
  },
  loadPrefs: function() {
    var fs = ProjectManager.extMan.getLocalFS();
    var pjf = fs.appendPath(fs.getConfigDir(), ProjectManager.prefName);
    if(fs.fileExists(pjf)) {
      var pref = JSON.parse(fs.readFile(pjf));
      ProjectManager.log = pref.log;
      ProjectManager.noteExt = pref.ext;
    } else {
      ProjectManager.savePrefs();
    }
  },
  getTemplateFile: function() {
    var fs = ProjectManager.extMan.getLocalFS();

    //
    // See if they have the project manager for fig installed and using.
    //
    var tempf = fs.appendPath(fs.getHomeDir(), '.projectFiles/projectmanager.json');
    if(fs.fileExists(tempf)) {
      ProjectManager.templates = JSON.parse(fs.readFile(tempf));
      ProjectManager.templates = ProjectManager.templates.templates;
    } else {
      tempf = fs.appendPath(fs.getConfigDir(), 'templates.json');
      if(fs.fileExists(tempf)) {
        ProjectManager.templates = JSON.parse(fs.readFile(tempf));
      } else {
        //
        // They have never ran templates. Add the default and return it.
        //
        ProjectManager.templates = [{
          name: "Svelte Template",
          templateDirUrl: "sveltejs/template",
          local: false,
          runScript: "npm install;"
        }];
        ProjectManager.saveTemplateFile();
      }
    }
    return(ProjectManager.templates);
  },
  saveTemplateFile: function() {
    //
    // See if they have the project manager for fig installed and using.
    //
    var fs = ProjectManager.extMan.getLocalFS();
    var tempf = fs.appendPath(fs.getHomeDir(), '.projectFiles/projectmanager.json');
    var templates = {};
    if(fs.fileExists(tempf)) {
      //
      // There is a fig templates file. Get it.
      //
      templates = JSON.parse(fs.readFile(tempf));
      templates.templates = ProjectManager.templates;
    } else {
      //
      // No fig based templates, create our own.
      //
      tempf = fs.appendPath(fs.getConfigDir(), 'templates.json');
      templates = ProjectManager.templates;
    }
    //
    // Write the template file.
    //
    fs.writeFile(tempf, JSON.stringify(templates));
  },
  getTemplate: function(title, returnFun) {
    var templates = ProjectManager.getTemplateFile();
    var dirs = [];
    templates.forEach(template => {
      dirs.push({
        name: template.name,
        value: template.name
      });
    });
    if(dirs.length > 0) ProjectManager.extMan.getExtCommand('pickItem').command(title,dirs,returnFun);
    else ProjectManager.extMan.getExtCommand('showMessage').command('Project Manager','Sorry, no templates defined yet.');
  },
  installTemplate: function() {
    ProjectManager.getTemplate('Install Which Template?', name => {
      //
      // Get the template from the array of templates.
      //
      var templates = ProjectManager.getTemplateFile();
      var template = templates.find(item => item.name === name);

      //
      // Install it.
      //
      var cur = ProjectManager.extMan.getExtCommand('getCursor').command();
      var fs = ProjectManager.extMan.getLocalFS();
      if(template.local) {
        //
        // It's a local template on the computer. Copy the contents.
        //
        fs.runCommandLine(`cp -R '${template.templateDirUrl}/' '${cur.entry.dir}';`,(err, stdout)=>{
          if(err) {
            ProjectManager.logToUser(err);
            console.log('Installing Template: ');
            console.log(err);
          } else {
            ProjectManager.logToUser(stdout);
            //
            // Run the install script.
            //
            fs.runCommandLine(`${template.runScript}`,(err, stdout)=>{
              if(err) ProjectManager.logToUser(err);
              ProjectManager.logToUser(stdout);
            },{},{
              cwd: cur.entry.dir
            });
          }
        },{},{
          cwd: cur.entry.dir
        });
      } else {
        //
        // It's a web template. Copy it down to the directory.
        //
        fs.runCommandLine(`npx degit --force '${template.templateDirUrl}' '${cur.entry.dir}';`, (err, stdout)=>{
          if(err) {
            ProjectManager.logToUser(err);
            console.log('Installing web template: ');
            console.log(err);
          } else {
            ProjectManager.logToUser(stdout);
        
            //
            // Run the install script.
            //
            fs.runCommandLine(`${template.runScript}`,(err, stdout)=>{
              if(err) ProjectManager.logToUser(err);
              ProjectManager.logToUser(stdout);
            },{},{
              cwd: cur.entry.dir
            });
          }
        },{},{
          cwd: cur.entry.dir
        });
      }
      //
      // Make the Notes directory and the startup script for the project.
      //
      fs.makeDir(fs.appendPath(cur.entry.dir, '.notes'));
      fs.createFile(cur.entry.dir, '.startproject');
    });
  },
  makeWebTemplate: function() {
    var templates = ProjectManager.getTemplateFile();

    //
    // Get the name for the template.
    //
    ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager','What is the template\'s name?', (name) => {
      //
      // Get the install script to run.
      //
      setTimeout(() => {
        ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager','What is the GitHub template name?', (wtmp) => {
          setTimeout(() => {
            ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager','What is the install command line?', (script) => {
              templates.push({
                name: name,
                templateDirUrl: wtmp,
                local: false,
                runScript: script
              });
              ProjectManager.templates = templates;
              ProjectManager.saveTemplateFile();
            });
          }, 100);
        });
      }, 100);
    });
  },
  makeLocalTemplate: function() {
    var cur = ProjectManager.extMan.getExtCommand('getCursor').command();
    var templates = ProjectManager.getTemplateFile();

    //
    // Get the name for the template.
    //
    ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager','What is the template\'s name?', (name) => {
      console.log(name);
      //
      // Get the install script to run.
      //
      setTimeout(() => {
        ProjectManager.extMan.getExtCommand('askQuestion').command('Project Manager','What is the install command line?', (script) => {
          console.log(script);
          templates.push({
            name: name,
            templateDirUrl: cur.entry.dir,
            local: true,
            runScript: script
          });
          ProjectManager.templates = templates;
          ProjectManager.saveTemplateFile();
        });
      }, 100);
    });
  },
  removeTemplate: function() {
    ProjectManager.getTemplate('Remove Which Template?', name => {
      //
      // Remove the template from the array of templates.
      //
      var templates = ProjectManager.getTemplateFile();
      ProjectManager.templates = templates.filter(item => item.name !== name);
      ProjectManager.saveTemplateFile();
    });
  },
  gotoTemplate: function() {
    ProjectManager.getTemplate('Go to Which Template?', name => {
      //
      // Get the template from the array of templates.
      //
      var templates = ProjectManager.getTemplateFile();
      var template = templates.find(item => item.name === name);
      if(template.local) {
        //
        // Go to the template directory since it's local.
        //
        ProjectManager.extMan.getExtCommand('changeDir').command({
          path: template.templateDirUrl
        });
      } else {
        //
        // Open the website for the template.
        //
        ProjectManager.extMan.getLocalFS().runCommandLine(`open 'https://GitHub.com/${template.templateDirUrl}';`, (err, stdout)=>{
          if(err) {
            ProjectManager.logToUser(err);
            console.log('Opening web template: ');
            console.log(err);
          } else {
            ProjectManager.logToUser(stdout);
          }
        },{},{});
      }
    });
  }
};
return(ProjectManager);


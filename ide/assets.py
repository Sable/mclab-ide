from flask.ext.assets import Bundle, Environment

assets = Environment()

js_ace = Bundle(
    'bower_components/ace-builds/src-noconflict/ace.js',
    'bower_components/ace-builds/src-noconflict/mode-matlab.js',
    'bower_components/ace-builds/src-noconflict/keybinding-emacs.js',
    'bower_components/ace-builds/src-noconflict/keybinding-vim.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_dark.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_light.js',
    'bower_components/ace-builds/src-noconflict/theme-monokai.js',
    'bower_components/ace-builds/src-noconflict/theme-textmate.js',
    filters='jsmin',
    output='gen/ace.js')

js_libs = Bundle(
    'bower_components/jquery/dist/jquery.js',
    'bower_components/jquery.terminal/js/jquery.mousewheel-min.js',
    'bower_components/jquery.terminal/js/jquery.terminal-min.js',
    'bower_components/bootstrap/dist/js/bootstrap.min.js',
    'bower_components/pnotify/pnotify.core.js',
    'bower_components/bootstrap-contextmenu/bootstrap-contextmenu.js',
    'bower_components/bootbox/bootbox.js',
    'bower_components/underscore/underscore.js',
    'bower_components/knockout.js/knockout.js',
    filters='jsmin',
    output='gen/libs.js')

js_app = Bundle(
    'js/bindings.js',
    'js/ide.js',
    'js/utils.js',
    'js/ast.js',
    'js/ajax.js',
    'js/callgraph.js',
    'js/explorer.js',
    'js/tabs.js',
    'js/editor.js',
    filters='jsmin',
    output='gen/app.js')


js_all = Bundle(js_ace, js_libs, js_app)

css_app = Bundle(
    'bower_components/pnotify/pnotify.core.css',
    'bower_components/jquery.terminal/css/jquery.terminal.css',
    Bundle('less/style.less', filters='less', output='gen/style.css'),
    filters='cssmin',
    output='gen/packed.css')

css_specs = Bundle(
    'bower_components/jasmine/lib/jasmine-core/jasmine.css',
    filters='cssmin',
    output='gen/jasmine.css')

js_specs = Bundle(
    'bower_components/jasmine/lib/jasmine-core/jasmine.js',
    'bower_components/jasmine/lib/jasmine-core/jasmine-html.js',
    'bower_components/jasmine/lib/jasmine-core/boot.js',
    'js/spec/explorer_spec.js',
    'js/spec/tabs_spec.js',
    filters='jsmin',
    output='gen/specs.js'
)

assets.register('js_all', js_all)
assets.register('js_ace', js_ace)
assets.register('js_libs', js_libs)
assets.register('js_app', js_app)
assets.register('css_app', css_app)
assets.register('css_specs', css_specs)
assets.register('js_specs', js_specs)

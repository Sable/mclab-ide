from flask.ext.assets import Bundle, Environment

assets = Environment()

js_ace = Bundle(
    'bower_components/ace-builds/src-noconflict/ace.js',
    'bower_components/ace-builds/src-noconflict/mode-matlab.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_dark.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_light.js',
    filters='jsmin',
    output='gen/ace.js')

js_libs = Bundle(
    'bower_components/jquery/jquery.js',
    'bower_components/bootstrap/dist/js/bootstrap.min.js',
    'bower_components/jqtree/tree.jquery.js',
    'bower_components/pnotify/jquery.pnotify.min.js',
    filters='jsmin',
    output='gen/libs.js')

js_app = Bundle(
    'js/ide.js',
    'js/utils.js',
    'js/ajax.js',
    'js/tree.js',
    'js/tabs.js',
    'js/editor.js',
    filters='jsmin',
    output='gen/app.js')


css = Bundle(
    'bower_components/bootstrap/dist/css/bootstrap.css',
    'bower_components/jqtree/jqtree.css',
    'bower_components/pnotify/jquery.pnotify.default.css',
    Bundle('less/style.less', filters='less', output='gen/style.css'),
    filters='cssmin',
    output='gen/packed.css')

assets.register('js_ace', js_ace)
assets.register('js_libs', js_libs)
assets.register('js_app', js_app)
assets.register('css_all', css)
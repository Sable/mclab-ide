from flask.ext.assets import Bundle, Environment

assets = Environment()

js = Bundle(
    'bower_components/ace-builds/src-noconflict/ace.js',
    'bower_components/ace-builds/src-noconflict/mode-matlab.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_dark.js',
    'bower_components/ace-builds/src-noconflict/theme-solarized_light.js',
    'bower_components/jquery/jquery.js',
    'bower_components/bootstrap/dist/js/bootstrap.min.js',
    'bower_components/jqtree/tree.jquery.js',
    'bower_components/pnotify/jquery.pnotify.min.js',
    'js/ide.js',
    'js/utils.js',
    'js/ajax.js',
    'js/tree.js',
    'js/tabs.js',
    'js/editor.js',
    filters='jsmin',
    output='gen/packed.js')

css = Bundle(
    'bower_components/bootstrap/dist/css/bootstrap.css',
    'bower_components/jqtree/jqtree.css',
    'bower_components/pnotify/jquery.pnotify.default.css',
    Bundle('less/style.less', filters='less'),
    filters='cssmin',
    output='gen/packed.css')

assets.register('js_all', js)
assets.register('css_all', css)

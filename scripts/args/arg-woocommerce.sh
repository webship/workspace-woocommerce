#!/usr/bin/env bash

argparse "$@" <<ARGEOF || exit 1
parser.add_argument('PROJECT_NAME',
                    help='The name of the project: its folder, its DDEV project and its host name.')
parser.add_argument('-v', '--version',
                    default="${site_version}",
                    help='The WooCommerce release to add, from the plugin directory: latest, or a version number. Example: --version 11.3.0 [default %(default)s]')
parser.add_argument('-w', '--wordpress-version',
                    default="${wordpress_version}",
                    help='The WordPress release to download: latest, nightly, or a version number. Example: --wordpress-version 7.1.5 [default %(default)s]')
parser.add_argument('-i', '--install',
                    action='store_true',
                    default=False,
                    help='Install WordPress with the workspace account as the administrator, and set the shop up: the onboarding wizard skipped, open to visitors, the offline payments, a flat rate, the mini cart in the header.')
parser.add_argument('-a', '--add-users',
                    action='store_true',
                    default=False,
                    help='With --install, add the default accounts: administrator, shop_manager and customer, the ones the test scenarios log in as.')
parser.add_argument('-s', '--sample-data',
                    action='store_true',
                    default=False,
                    help='With --install, import the sample products that come with the shop plugin (sample_products.xml), the ones the test scenarios name.')
parser.add_argument('-l', '--launch',
                    action='store_true',
                    default=False,
                    help='Open the shop in a browser when it is ready.')
parser.add_argument('--locale',
                    default="en_US",
                    help='The language WordPress is downloaded in. Example: --locale ar [default %(default)s]')
parser.add_argument('--php-version',
                    default="",
                    choices=['8.5', '8.4', '8.3', '8.2'],
                    help='PHP version for the project container; empty means the default of the container tool. Example: --php-version 8.4')
ARGEOF

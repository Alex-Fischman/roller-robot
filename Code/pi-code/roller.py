from __future__ import print_function
import sys
import traceback

import oneshot

while True:
    try:
        print("Here we go!")
        oneshot.oneshot()
    except:
        traceback.print_exc()
        if type(sys.exc_info()[0]) == 'exeptions.UnboudLocalError':
            break
    oneshot = reload(oneshot)

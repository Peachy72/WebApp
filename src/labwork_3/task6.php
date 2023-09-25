<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task 6</title>
</head>
<body>
    <?php
        // Bubble sort algorithm
        function bubbleSort($array) {
            for ($i = 0; $i < count($array); $i++) {
                for ($j = $i + 1; $j < count($array); $j++) {
                    if ($array[$i] > $array[$j]) {
                        $temp = $array[$i];
                        $array[$i] = $array[$j];
                        $array[$j] = $temp;
                    }
                }
            }
            return $array;
        }
        
        // Example: 
        $array = [1, 5, 3, 2, 4];
        echo "Before sorting: ";
        foreach ($array as $value) {
            echo $value . " ";
        }
        echo "<br>";
        echo "After sorting: ";
        $array = bubbleSort($array);
        foreach ($array as $value) {
            echo $value . " ";
        }

        // TODO: alternative sorting algorithm

    ?>
</body>
</html>
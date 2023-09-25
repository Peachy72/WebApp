<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task 7</title>
</head>
<body>
    <?php
        // function to reverse a string
        function reverseString($string) {
            $reversedString = "";
            for ($i = strlen($string) - 1; $i >= 0; $i--) {
                $reversedString .= $string[$i];
            }
            return $reversedString;
        }

        // Example: 
        $string = "Hello World!";
        echo "Before reversing: " . $string . "<br>";
        echo "After reversing: " . reverseString($string);
    ?>
</body>
</html>